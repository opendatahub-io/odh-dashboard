export type UserState = {
  username: string;
  isAdmin: boolean;

  userLoading: boolean;
  userError: Error | null;
};

export type DashboardNamespace = {
  dashboardNamespace: string;
};
