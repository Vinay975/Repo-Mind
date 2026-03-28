import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  api,
  User,
  RepoSession,
  ReadmeContent,
  GeneratedContent,
  DocumentationContent,
  DocumentationType,
  ContributorInsightsReport,
} from "./api";

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
        if (token) api.setToken(token);
      },

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const response = await api.login(email, password);
          api.setToken(response.access_token);
          set({ token: response.access_token, user: response.user, isAuthenticated: true, isLoading: false });
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
          set({ token: response.access_token, user: response.user, isAuthenticated: true, isLoading: false });
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
        if (!token) { set({ isLoading: false, isAuthenticated: false }); return; }
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
      partialize: (state) => ({ user: state.user, token: state.token, isAuthenticated: state.isAuthenticated }),
      onRehydrateStorage: () => (state) => {
        if (state?.token) api.setToken(state.token);
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
    (set) => ({
      currentSession: null,
      sessions: [],
      isAnalyzing: false,
      hasHydrated: false,

      setHasHydrated: (value) => set({ hasHydrated: value }),

      analyzeRepo: async (url) => {
        set({ isAnalyzing: true });
        try {
          const session = await api.analyzeRepo(url);
          set((state) => ({ currentSession: session, sessions: [session, ...state.sessions], isAnalyzing: false }));
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

      setCurrentSession: (session) => set({ currentSession: session }),

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
      partialize: (state) => ({ currentSession: state.currentSession }),
      onRehydrateStorage: () => (state) => { state?.setHasHydrated(true); },
    }
  )
);

// README store
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
      set((state) => ({ currentReadme: readme, versions: [readme, ...state.versions], isGenerating: false }));
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

  setCurrentReadme: (readme) => set({ currentReadme: readme }),

  updateReadme: async (readmeId, content) => {
    const updated = await api.updateReadme(readmeId, content);
    set((state) => ({ currentReadme: updated, versions: [updated, ...state.versions] }));
    return updated;
  },
}));

// Documentation store
interface DocumentationState {
  currentDoc: DocumentationContent | null;
  versions: DocumentationContent[];
  isGenerating: boolean;
  docType: DocumentationType;
  setDocType: (type: DocumentationType) => void;
  generateDoc: (sessionId: number, docType: DocumentationType, includeVisuals?: boolean, customInstructions?: string) => Promise<DocumentationContent>;
  fetchVersions: (sessionId: number, docType: DocumentationType) => Promise<void>;
  setCurrentDoc: (doc: DocumentationContent | null) => void;
  updateDoc: (docId: number, content: string) => Promise<DocumentationContent>;
}

export const useDocumentationStore = create<DocumentationState>()((set) => ({
  currentDoc: null,
  versions: [],
  isGenerating: false,
  docType: "project_summary",

  setDocType: (type) => set({ docType: type }),

  generateDoc: async (sessionId, docType, includeVisuals, customInstructions) => {
    set({ isGenerating: true });
    try {
      const doc = await api.generateDocumentation({
        repo_session_id: sessionId,
        document_type: docType,
        include_visuals: includeVisuals,
        custom_instructions: customInstructions,
      });
      set((state) => ({ currentDoc: doc, versions: [doc, ...state.versions], isGenerating: false }));
      return doc;
    } catch (error) {
      set({ isGenerating: false });
      throw error;
    }
  },

  fetchVersions: async (sessionId, docType) => {
    const { versions } = await api.getDocumentationVersions(sessionId, docType);
    set({ versions, currentDoc: versions[0] || null });
  },

  setCurrentDoc: (doc) => set({ currentDoc: doc }),

  updateDoc: async (docId, content) => {
    const updated = await api.updateDocumentation(docId, content);
    set((state) => ({ currentDoc: updated, versions: [updated, ...state.versions] }));
    return updated;
  },
}));

// Insights store
interface InsightsState {
  currentInsight: ContributorInsightsReport | null;
  versions: ContributorInsightsReport[];
  isGenerating: boolean;
  generateInsights: (sessionId: number, monthsBack?: number, customInstructions?: string) => Promise<ContributorInsightsReport>;
  fetchVersions: (sessionId: number) => Promise<void>;
  setCurrentInsight: (insight: ContributorInsightsReport | null) => void;
  updateInsight: (insightId: number, content: string) => Promise<ContributorInsightsReport>;
}

export const useInsightsStore = create<InsightsState>()((set) => ({
  currentInsight: null,
  versions: [],
  isGenerating: false,

  generateInsights: async (sessionId, monthsBack, customInstructions) => {
    set({ isGenerating: true });
    try {
      const insight = await api.generateInsights({
        repo_session_id: sessionId,
        months_back: monthsBack,
        custom_instructions: customInstructions,
      });
      set((state) => ({ currentInsight: insight, versions: [insight, ...state.versions], isGenerating: false }));
      return insight;
    } catch (error) {
      set({ isGenerating: false });
      throw error;
    }
  },

  fetchVersions: async (sessionId) => {
    const { versions } = await api.getInsightsVersions(sessionId);
    set({ versions, currentInsight: versions[0] || null });
  },

  setCurrentInsight: (insight) => set({ currentInsight: insight }),

  updateInsight: async (insightId, content) => {
    const updated = await api.updateInsights(insightId, content);
    set((state) => ({ currentInsight: updated, versions: [updated, ...state.versions] }));
    return updated;
  },
}));

export type DashboardModule = "readme" | "documentation" | "insights";

interface UIState {
  activeModule: DashboardModule;
  setActiveModule: (module: DashboardModule) => void;
  history: { readme: GeneratedContent[]; docs: GeneratedContent[]; insights: GeneratedContent[] };
  setHistory: (history: UIState["history"]) => void;
  historyTriggerItem: GeneratedContent | null;
  setHistoryTriggerItem: (item: GeneratedContent | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  activeModule: "readme",
  setActiveModule: (module) => set({ activeModule: module }),
  history: { readme: [], docs: [], insights: [] },
  setHistory: (history) => set({ history }),
  historyTriggerItem: null,
  setHistoryTriggerItem: (item) => set({ historyTriggerItem: item }),
}));
