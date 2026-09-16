import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getCrmDailyBriefing, updateCrmActivity } from '../api/crmActivities';
import type { CrmDailyBriefing } from '../api/crmActivities';

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

export type NotificationTab = 'today' | 'pending' | 'updates';

interface UpdatesState {
  commits: GithubCommit[];
  lastSeenSha: string | null;
  hasSeenLatest: boolean;
  isModalOpen: boolean;
  activeTab: NotificationTab;
  isLoading: boolean;
  isBriefingLoading: boolean;
  error: string | null;
  lastFetchedAt: number | null;
  briefing: CrmDailyBriefing | null;

  fetchUpdates: (userRole?: string) => Promise<void>;
  fetchBriefing: () => Promise<void>;
  toggleCompleteActivity: (activityId: string, currentCompleted: boolean) => Promise<void>;
  markAsSeen: () => void;
  getUnreadCount: () => number;
  getTotalBadgeCount: () => number;
  setActiveTab: (tab: NotificationTab) => void;
  openModal: (tab?: NotificationTab) => void;
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
      activeTab: 'today',
      isLoading: false,
      isBriefingLoading: false,
      error: null,
      lastFetchedAt: null,
      briefing: null,

      fetchBriefing: async () => {
        set({ isBriefingLoading: true });
        try {
          const data = await getCrmDailyBriefing();
          const sessionKey = 'dts_daily_briefing_shown_session';
          const alreadyShownThisSession = sessionStorage.getItem(sessionKey) === 'true';

          // Determinar pestaña recomendada según relevancia
          let recommendedTab: NotificationTab = 'today';
          if (data.todayActivities && data.todayActivities.length > 0) {
            recommendedTab = 'today';
          } else if (data.pendingActivities && data.pendingActivities.length > 0) {
            recommendedTab = 'pending';
          } else {
            recommendedTab = 'updates';
          }

          // Auto-apertura si es una nueva sesión en el navegador
          let shouldAutoOpen = false;
          if (!alreadyShownThisSession) {
            sessionStorage.setItem(sessionKey, 'true');
            // Abre la ventana emergente al iniciar sesión si tiene eventos hoy o pendientes
            shouldAutoOpen = true;
          }

          set(state => ({
            briefing: data,
            isBriefingLoading: false,
            activeTab: state.isModalOpen ? state.activeTab : recommendedTab,
            isModalOpen: shouldAutoOpen ? true : state.isModalOpen,
          }));
        } catch (err: any) {
          console.error('Error al obtener el briefing diario de actividades:', err);
          set({ isBriefingLoading: false });
        }
      },

      toggleCompleteActivity: async (activityId: string, currentCompleted: boolean) => {
        const newCompleted = !currentCompleted;
        // Actualización optimista inmediata en la UI
        set(state => {
          if (!state.briefing) return {};
          const updatedToday = state.briefing.todayActivities.map(a =>
            a.id === activityId ? { ...a, is_completed: newCompleted } : a
          );
          const updatedPending = state.briefing.pendingActivities.map(a =>
            a.id === activityId ? { ...a, is_completed: newCompleted } : a
          );
          const todayCompleted = updatedToday.filter(a => a.is_completed).length;

          return {
            briefing: {
              ...state.briefing,
              todayActivities: updatedToday,
              pendingActivities: updatedPending,
              stats: {
                ...state.briefing.stats,
                todayPending: updatedToday.length - todayCompleted,
                todayCompleted,
                pastPendingTotal: updatedPending.filter(a => !a.is_completed).length,
              },
            },
          };
        });

        try {
          await updateCrmActivity(activityId, { isCompleted: newCompleted });
        } catch (error) {
          console.error('Error al actualizar estado de la actividad:', error);
          get().fetchBriefing();
        }
      },

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
            set({ isLoading: false, lastFetchedAt: Date.now() });
            return;
          }

          if (!response.ok) throw new Error('Failed to fetch updates');
          
          let commits: GithubCommit[] = await response.json();
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
            const tagMatch = msgUpper.match(/\[([A-Z]+)\]/);
            
            if (!tagMatch) {
              const isAdminContent = msgUpper.includes('ADMIN') || msgUpper.includes('SYSTEM') || msgUpper.includes('DATABASE') || msgUpper.includes('DB ');
              if (roleUpper === 'ADMIN') return true;
              return !isAdminContent;
            }
            
            const tag = tagMatch[1];
            if (roleUpper === 'ADMIN') return true;
            if (roleUpper === 'VENTAS') {
              const salesTags = ['VENTAS', 'COMERCIAL', 'SALES', 'GLOBAL'];
              return salesTags.includes(tag);
            }
            if (roleUpper === 'DIRECCION' || roleUpper === 'GERENCIA') {
              const dirTags = ['DIRECCION', 'GERENCIA', 'VENTAS', 'COMERCIAL', 'GLOBAL', 'FINANZAS'];
              return dirTags.includes(tag);
            }

            return tag === roleUpper || tag === 'GLOBAL';
          });

          // Limpiar mensajes para UI
          commits = commits.map(c => ({
            ...c,
            commit: {
              ...c.commit,
              message: c.commit.message.replace(/\[[A-Z]+\]\s*/gi, '').trim()
            }
          }));

          commits = commits.slice(0, 10);
          const { lastSeenSha } = get();
          
          if (commits.length > 0) {
            const latestSha = commits[0].sha;
            const hasSeenLatest = lastSeenSha === latestSha;

            set({ 
              commits, 
              hasSeenLatest, 
              isLoading: false, 
              lastFetchedAt: Date.now() 
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

      getTotalBadgeCount: () => {
        const { briefing } = get();
        const unreadCommits = get().getUnreadCount();
        const todayPending = briefing?.stats?.todayPending || 0;
        const pastPending = briefing?.stats?.pastPendingTotal || 0;
        return todayPending + pastPending + unreadCommits;
      },

      setActiveTab: (tab: NotificationTab) => set({ activeTab: tab }),

      openModal: (tab?: NotificationTab) => {
        set(state => ({
          isModalOpen: true,
          activeTab: tab || state.activeTab,
        }));
      },
      
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
