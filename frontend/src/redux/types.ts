import { store } from './store/store';

export type RootState = ReturnType<typeof store.getState>;

export interface GetUserAction {
  type: string;
  payload: {
    user?: string;
    clusterID?: string;
    error?: Error | null;
  };
}

export interface AppState {
  user?: string;
  userLoading: boolean;
  userError?: Error | null;
  clusterID?: string;
}
