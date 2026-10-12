import type { NavigatorScreenParams } from "@react-navigation/native";

export type InboxStackParamList = {
  InboxHome: undefined;
  Task: { workspaceId: string; taskId: string };
};

export type BoardStackParamList = {
  BoardHome: undefined;
  Project: {
    workspaceId: string;
    projectId: string;
    projectName: string;
    view?: "list" | "board" | "calendar";
  };
  Task: { workspaceId: string; taskId: string };
};

export type SearchStackParamList = {
  SearchHome: undefined;
  Task: { workspaceId: string; taskId: string };
  Workspace: { workspaceId: string; workspaceName: string };
  Project: {
    workspaceId: string;
    projectId: string;
    projectName: string;
    view?: "list" | "board" | "calendar";
  };
};

export type MenuStackParamList = {
  MenuHome: undefined;
  Settings: undefined;
  DeleteAccount: undefined;
  PrivacyPolicy: undefined;
  Activity: { workspaceId: string };
  Members: { workspaceId: string };
  Workspace: { workspaceId: string; workspaceName: string };
  Project: {
    workspaceId: string;
    projectId: string;
    projectName: string;
    view?: "list" | "board" | "calendar";
  };
  Task: { workspaceId: string; taskId: string };
};

export type MainTabParamList = {
  InboxTab: NavigatorScreenParams<InboxStackParamList>;
  BoardTab: NavigatorScreenParams<BoardStackParamList>;
  SearchTab: NavigatorScreenParams<SearchStackParamList>;
  MenuTab: NavigatorScreenParams<MenuStackParamList>;
};

export type RootStackParamList = {
  Onboarding: undefined;
  /** `email` prefills the field — after sign-up, verification or a reset. */
  Login: { email?: string; notice?: string } | undefined;
  Register: undefined;
  ForgotPassword: { email?: string } | undefined;
  ResetPassword: { token?: string } | undefined;
  VerifyEmail: { email: string };
  Main: NavigatorScreenParams<MainTabParamList>;
  Invite: { token: string };
  /** Kept for deep-link / invite redirect into a workspace hub */
  Workspace: { workspaceId: string; workspaceName: string };
  Inbox: { workspaceId: string };
  Project: {
    workspaceId: string;
    projectId: string;
    projectName: string;
    view?: "list" | "board" | "calendar";
  };
  Task: { workspaceId: string; taskId: string };
  Members: { workspaceId: string };
  Activity: { workspaceId: string };
  Settings: undefined;
  Search: undefined;
};
