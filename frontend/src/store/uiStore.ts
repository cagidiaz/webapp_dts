import { create } from 'zustand';

/**
 * Global UI state store — Zustand
 * Controls sidebar, theme, and global filter state
 */

interface UIState {
  /** Sidebar collapsed state */
  isSidebarCollapsed: boolean;
  toggleSidebar: () => void;

  /** Theme: 'dark' | 'light' */
  theme: 'dark' | 'light';
  toggleTheme: () => void;

  /** Global date range filter */
  dateRange: {
    from: string;
    to: string;
  };
  setDateRange: (from: string, to: string) => void;

  /** Current Page Header Info */
  pageTitle: string;
  pageSubtitle?: string;
  pageIcon: React.ReactNode | null;
  pageInfoProps?: {
    title: string;
    description: string;
    objective?: string;
    source?: string;
  };
  setPageInfo: (info: {
    title: string;
    subtitle?: string;
    icon?: React.ReactNode;
    infoProps?: {
      title: string;
      description: string;
      objective?: string;
      source?: string;
    }
  }) => void;
}

export const useUIStore = create<UIState>((set) => ({
  // Sidebar
  isSidebarCollapsed: false,
  toggleSidebar: () =>
    set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

  // Theme
  theme: 'dark',
  toggleTheme: () =>
    set((state) => {
      const newTheme = state.theme === 'dark' ? 'light' : 'dark';
      // Sync with body class for CSS overrides
      document.body.classList.toggle('light', newTheme === 'light');
      return { theme: newTheme };
    }),

  // Date range filter
  dateRange: {
    from: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    to: new Date().toISOString().split('T')[0],
  },
  setDateRange: (from, to) => set({ dateRange: { from, to } }),

  // Page Info
  pageTitle: '',
  pageSubtitle: '',
  pageIcon: null,
  pageInfoProps: undefined,
  setPageInfo: ({ title, subtitle, icon, infoProps }) => 
    set({ 
      pageTitle: title, 
      pageSubtitle: subtitle || '', 
      pageIcon: icon || null,
      pageInfoProps: infoProps
    }),
}));
