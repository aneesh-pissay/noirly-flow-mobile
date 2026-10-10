import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getPreference, setPreference } from "noirly-flow-native";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { MemberRole, Project, Workspace } from "../types";

const WORKSPACE_KEY = "lastWorkspaceId";
const PROJECT_KEY = "lastProjectId";

type WorkspaceContextValue = {
  workspaceId: string | null;
  role: MemberRole | null;
  workspaces: Workspace[];
  projects: Project[];
  activeProjectId: string | null;
  /** False until the last-used workspace has been restored after sign-in. */
  ready: boolean;
  setWorkspaces: (workspaces: Workspace[]) => void;
  setProjects: (projects: Project[]) => void;
  setWorkspaceId: (id: string | null) => void;
  setRole: (role: MemberRole | null) => void;
  setActiveProjectId: (id: string | null) => void;
};

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const { session } = useAuth();
  const [workspaceId, setWorkspaceIdState] = useState<string | null>(null);
  const [role, setRole] = useState<MemberRole | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectIdState] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  // The web app remembers the last workspace for the session; on a phone the
  // app is relaunched constantly, so it is kept in native preferences instead.
  const setWorkspaceId = useCallback((id: string | null) => {
    setWorkspaceIdState(id);
    setPreference(WORKSPACE_KEY, id);
  }, []);

  const setActiveProjectId = useCallback((id: string | null) => {
    setActiveProjectIdState(id);
    setPreference(PROJECT_KEY, id);
  }, []);

  const signedIn = Boolean(session);
  useEffect(() => {
    if (!signedIn) {
      setWorkspaceIdState(null);
      setRole(null);
      setWorkspaces([]);
      setProjects([]);
      setActiveProjectIdState(null);
      setReady(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const [storedWorkspace, storedProject] = await Promise.all([
          getPreference(WORKSPACE_KEY),
          getPreference(PROJECT_KEY),
        ]);
        if (!storedWorkspace) return;
        const detail = await api.getWorkspace(storedWorkspace);
        if (cancelled) return;
        setWorkspaceIdState(detail.workspace.id);
        setRole(detail.workspace.role);
        setProjects(detail.projects);
        setActiveProjectIdState(
          storedProject && detail.projects.some((p) => p.id === storedProject)
            ? storedProject
            : (detail.projects[0]?.id ?? null),
        );
      } catch {
        // Removed from that workspace, or it was deleted — start from personal.
        setPreference(WORKSPACE_KEY, null);
        setPreference(PROJECT_KEY, null);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  const value = useMemo(
    () => ({
      workspaceId,
      role,
      workspaces,
      projects,
      activeProjectId,
      ready,
      setWorkspaces,
      setProjects,
      setWorkspaceId,
      setRole,
      setActiveProjectId,
    }),
    [
      workspaceId,
      role,
      workspaces,
      projects,
      activeProjectId,
      ready,
      setWorkspaceId,
      setActiveProjectId,
    ],
  );

  return (
    <WorkspaceContext.Provider value={value}>{children}</WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) throw new Error("useWorkspace requires WorkspaceProvider");
  return ctx;
}
