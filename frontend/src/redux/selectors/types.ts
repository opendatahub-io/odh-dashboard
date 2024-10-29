export type UserState = {
  username: string;
  userID: string;
  isAdmin: boolean;
  isAllowed: boolean;
  userLoading: boolean;
  userError: Error | null;
};

export type DashboardNamespace = {
  dashboardNamespace: string;
};

export type ClusterState = {
  clusterBranding?: string;
  clusterID?: string;
  serverURL?: string;
};
