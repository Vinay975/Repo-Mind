import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api, User, RepoSession, ReadmeContent } from "./api";

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  hasHydrated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  initializeToken: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      hasHydrated: false,
      
      setHasHydrated: (value) => set({ hasHydrated: value }),

      initializeToken: () => {
        const { token } = get();
        if (token) {
          api.setToken(token);
        }
      },

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const response = await api.login(email, password);
          api.setToken(response.access_token);
          set({ 
            token: response.access_token,
            user: response.user, 
            isAuthenticated: true, 
            isLoading: false 
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (email, username, password) => {
        set({ isLoading: true });
        try {
          const response = await api.register(email, username, password);
          api.setToken(response.access_token);
          set({ 
            token: response.access_token,
            user: response.user, 
            isAuthenticated: true, 
            isLoading: false 
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        api.setToken(null);
        set({ user: null, token: null, isAuthenticated: false });
      },

      checkAuth: async () => {
        const { token } = get();
        if (!token) {
          set({ isLoading: false, isAuthenticated: false });
          return;
        }
        
        // Make sure the API client has the token
        api.setToken(token);
        
        set({ isLoading: true });
        try {
          const user = await api.getCurrentUser();
          set({ user, isAuthenticated: true, isLoading: false });
        } catch {
          api.setToken(null);
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
        }
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({ 
        user: state.user, 
        token: state.token,
        isAuthenticated: state.isAuthenticated 
      }),
      onRehydrateStorage: () => (state) => {
        // Initialize API client token when store rehydrates
        if (state?.token) {
          api.setToken(state.token);
        }
        // Mark hydration as complete
        state?.setHasHydrated(true);
      },
    }
  )
);

interface RepoState {
  currentSession: RepoSession | null;
  sessions: RepoSession[];
  isAnalyzing: boolean;
  hasHydrated: boolean;
  analyzeRepo: (url: string) => Promise<RepoSession>;
  fetchSessions: () => Promise<void>;
  setCurrentSession: (session: RepoSession | null) => void;
  deleteSession: (id: number) => Promise<void>;
  setHasHydrated: (value: boolean) => void;
}

export const useRepoStore = create<RepoState>()(
  persist(
    (set, get) => ({
      currentSession: null,
      sessions: [],
      isAnalyzing: false,
      hasHydrated: false,

      setHasHydrated: (value) => set({ hasHydrated: value }),

      analyzeRepo: async (url) => {
        set({ isAnalyzing: true });
        try {
          const session = await api.analyzeRepo(url);
          set((state) => ({
            currentSession: session,
            sessions: [session, ...state.sessions],
            isAnalyzing: false,
          }));
          return session;
        } catch (error) {
          set({ isAnalyzing: false });
          throw error;
        }
      },

      fetchSessions: async () => {
        const sessions = await api.getRepoSessions();
        set({ sessions });
      },

      setCurrentSession: (session) => {
        set({ currentSession: session });
      },

      deleteSession: async (id) => {
        await api.deleteRepoSession(id);
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== id),
          currentSession: state.currentSession?.id === id ? null : state.currentSession,
        }));
      },
    }),
    {
      name: "repo-storage",
      partialize: (state) => ({
        currentSession: state.currentSession,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

interface ReadmeState {
  currentReadme: ReadmeContent | null;
  versions: ReadmeContent[];
  isGenerating: boolean;
  generateReadme: (sessionId: number, customInstructions?: string) => Promise<ReadmeContent>;
  fetchVersions: (sessionId: number) => Promise<void>;
  setCurrentReadme: (readme: ReadmeContent | null) => void;
  updateReadme: (readmeId: number, content: string) => Promise<ReadmeContent>;
}

export const useReadmeStore = create<ReadmeState>()((set) => ({
  currentReadme: null,
  versions: [],
  isGenerating: false,

  generateReadme: async (sessionId, customInstructions) => {
    set({ isGenerating: true });
    try {
      const readme = await api.generateReadme(sessionId, customInstructions);
      set((state) => ({
        currentReadme: readme,
        versions: [readme, ...state.versions],
        isGenerating: false,
      }));
      return readme;
    } catch (error) {
      set({ isGenerating: false });
      throw error;
    }
  },

  fetchVersions: async (sessionId) => {
    const { versions } = await api.getReadmeVersions(sessionId);
    set({ versions, currentReadme: versions[0] || null });
  },

  setCurrentReadme: (readme) => {
    set({ currentReadme: readme });
  },

  updateReadme: async (readmeId, content) => {
    const updated = await api.updateReadme(readmeId, content);
    set((state) => ({
      currentReadme: updated,
      versions: [updated, ...state.versions],
    }));
    return updated;
  },
}));

