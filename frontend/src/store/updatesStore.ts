import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface GithubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      date: string;
    };
  };
  html_url: string;
}

interface UpdatesState {
  commits: GithubCommit[];
  lastSeenSha: string | null;
  hasSeenLatest: boolean;
  isModalOpen: boolean;
  isLoading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
  fetchUpdates: (userRole?: string) => Promise<void>;
  markAsSeen: () => void;
  getUnreadCount: () => number;
  openModal: () => void;
  closeModal: () => void;
}

const GITHUB_REPO = 'cagidiaz/webapp_dts';

export const useUpdatesStore = create<UpdatesState>()(
  persist(
    (set, get) => ({
      commits: [],
      lastSeenSha: null,
      hasSeenLatest: true,
      isModalOpen: false,
      isLoading: false,
      error: null,
      lastFetchedAt: null,
      fetchUpdates: async (userRole?: string) => {
        // 1. En entorno de desarrollo local, no saturamos la cuota de GitHub API
        if (import.meta.env.DEV) {
          return;
        }

        const { lastFetchedAt } = get();
        // 2. En producción: evitar saturar el límite de GitHub (60 req/h): caché/espera de 15 minutos
        if (lastFetchedAt && Date.now() - lastFetchedAt < 15 * 60 * 1000) {
          return;
        }

        set({ isLoading: true, error: null });
        try {
          const API_URL_EXT = `https://api.github.com/repos/${GITHUB_REPO}/commits?sha=main&per_page=30`;
          const response = await fetch(API_URL_EXT);

          if (response.status === 403) {
            // Límite de tasa de GitHub alcanzado para la IP
            set({ isLoading: false, lastFetchedAt: Date.now() });
            return;
          }

          if (!response.ok) throw new Error('Failed to fetch updates');
          
          let commits: GithubCommit[] = await response.json();
          
          // Normalizar el rol del usuario
          const roleUpper = userRole?.toUpperCase() || 'GUEST';
          
          commits = commits.filter(c => {
            const rawMsg = c.commit.message.trim();
            const lowerMsg = rawMsg.toLowerCase();
            
            // Regla AGENTS.md: Solo commits feat: y style: descriptivos; filtrar fixes y cambios técnicos
            const isFixOrTech = lowerMsg.startsWith('fix:') || 
                                lowerMsg.startsWith('fix(') || 
                                lowerMsg.startsWith('chore:') || 
                                lowerMsg.startsWith('chore(') ||
                                lowerMsg.startsWith('ci:') || 
                                lowerMsg.startsWith('test:') ||
                                lowerMsg.startsWith('merge ');
            if (isFixOrTech) return false;

            const msgUpper = rawMsg.toUpperCase();
            
            // Extraer etiqueta entre corchetes ej: [ADMIN], [VENTAS]
            const tagMatch = msgUpper.match(/\[([A-Z]+)\]/);
            
            // 1. Si no hay etiqueta, es una actualización global (visible para todos)
            // EXCEPCIÓN: Si el mensaje contiene palabras clave de admin/sistema, lo ocultamos a no-admins
            if (!tagMatch) {
              const isAdminContent = msgUpper.includes('ADMIN') || msgUpper.includes('SYSTEM') || msgUpper.includes('DATABASE') || msgUpper.includes('DB ');
              if (roleUpper === 'ADMIN') return true;
              return !isAdminContent;
            }
            
            const tag = tagMatch[1];
            
            // 2. Reglas de visibilidad por rol
            if (roleUpper === 'ADMIN') return true; // ADMIN ve absolutamente todo
            
            // 3. Mapeos específicos para el equipo de ventas
            if (roleUpper === 'VENTAS') {
              const salesTags = ['VENTAS', 'COMERCIAL', 'SALES', 'GLOBAL'];
              return salesTags.includes(tag);
            }
            
            // 4. Mapeos para dirección
            if (roleUpper === 'DIRECCION') {
              const dirTags = ['DIRECCION', 'VENTAS', 'COMERCIAL', 'GLOBAL', 'FINANZAS'];
              return dirTags.includes(tag);
            }

            // 5. Caso por defecto: solo ver lo que coincide con su etiqueta o lo GLOBAL
            return tag === roleUpper || tag === 'GLOBAL';
          });

          // Limpiar los mensajes para la UI (quitar los corchetes)
          commits = commits.map(c => ({
            ...c,
            commit: {
              ...c.commit,
              message: c.commit.message.replace(/\[[A-Z]+\]\s*/gi, '').trim()
            }
          }));

          // Nos quedamos solo con los 10 más recientes después de filtrar
          commits = commits.slice(0, 10);

          const { lastSeenSha } = get();
          
          if (commits.length > 0) {
            const latestSha = commits[0].sha;
            
            // Si el usuario ya vio este commit exacto, NO abrir el modal jamás
            const hasSeenLatest = lastSeenSha === latestSha;

            // Comprobar si ya se mostró en la sesión actual
            const sessionKey = `dts_updates_shown_${latestSha}`;
            const alreadyShownThisSession = sessionStorage.getItem(sessionKey) === 'true';

            // Solo se abre si es una versión no vista Y no se ha mostrado aún en esta sesión
            const shouldOpen = !hasSeenLatest && !alreadyShownThisSession;

            if (shouldOpen) {
              sessionStorage.setItem(sessionKey, 'true');
            }

            set({ 
              commits, 
              hasSeenLatest, 
              isLoading: false,
              lastFetchedAt: Date.now(),
              isModalOpen: shouldOpen 
            });
          } else {
            set({ commits: [], isLoading: false, lastFetchedAt: Date.now() });
          }
        } catch (error: any) {
          set({ error: error.message, isLoading: false, lastFetchedAt: Date.now() });
        }
      },
      
      markAsSeen: () => {
        const { commits } = get();
        if (commits.length > 0) {
          set({ lastSeenSha: commits[0].sha, hasSeenLatest: true });
        }
      },
      
      getUnreadCount: () => {
        const { commits, lastSeenSha } = get();
        if (!lastSeenSha) return commits.length;
        const index = commits.findIndex(c => c.sha === lastSeenSha);
        return index === -1 ? commits.length : index;
      },

      openModal: () => set({ isModalOpen: true }),
      
      closeModal: () => {
        get().markAsSeen();
        set({ isModalOpen: false });
      }
    }),
    {
      name: 'dts-updates-storage',
      partialize: (state) => ({ 
        lastSeenSha: state.lastSeenSha,
        commits: state.commits,
        lastFetchedAt: state.lastFetchedAt
      }),
    }
  )
);
