export type UserState = {
  username: string;
  isAdmin: boolean;
  isAllowed: boolean;
  userLoading: boolean;
  userError: Error | null;
};

export type DashboardNamespace = {
  dashboardNamespace: string;
};
