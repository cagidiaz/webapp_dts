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
      
      fetchUpdates: async (userRole?: string) => {
        set({ isLoading: true, error: null });
        try {
          // Aumentamos a 30 por si al filtrar nos quedamos con pocos
          const API_URL_EXT = `https://api.github.com/repos/${GITHUB_REPO}/commits?sha=main&per_page=30`;
          const response = await fetch(API_URL_EXT);
          if (!response.ok) throw new Error('Failed to fetch updates');
          
          let commits: GithubCommit[] = await response.json();
          
          // Filtrado por rol
          if (userRole) {
            const roleUpper = userRole.toUpperCase();
            commits = commits.filter(c => {
              const msg = c.commit.message.toUpperCase();
              const tagMatch = msg.match(/\[([A-Z]+)\]/);
              
              if (!tagMatch) return true; // Sin etiqueta = Global
              
              const tag = tagMatch[1];
              if (roleUpper === 'ADMIN') return true; // ADMIN ve todo
              return tag === roleUpper;
            });
          }

          // Nos quedamos solo con los 10 más recientes después de filtrar
          commits = commits.slice(0, 10);

          const { lastSeenSha } = get();
          
          if (commits.length > 0) {
            const latestSha = commits[0].sha;
            // If we have no lastSeenSha, or it's different from the latest, we have unseen updates
            const hasSeenLatest = lastSeenSha === latestSha;
            set({ 
              commits, 
              hasSeenLatest, 
              isLoading: false,
              isModalOpen: !hasSeenLatest 
            });
          } else {
            set({ commits: [], isLoading: false });
          }
        } catch (error: any) {
          set({ error: error.message, isLoading: false });
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
      partialize: (state) => ({ lastSeenSha: state.lastSeenSha }), // Only persist lastSeenSha
    }
  )
);
