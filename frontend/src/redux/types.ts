export interface GetUserAction {
  type: string;
  payload: {
    user?: string;
    error?: Error | null;
  };
}

export interface AppState {
  user?: string;
  userLoading: boolean;
  userError?: Error | null;
}
