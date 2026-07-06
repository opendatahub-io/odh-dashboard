import { Notebook, UsernameMap } from '#~/types';

export enum PrivilegeState {
  ADMIN = 'Admin',
  USER = 'User',
}

export type UsernamePrivilegeMap = UsernameMap<PrivilegeState>;

export type AllowedUser = {
  username: string;
  privilege: PrivilegeState;
  lastActivity: string;
};

export type AdminViewUserData = {
  name: string;
  privilege: PrivilegeState;
  lastActivity?: string;
  serverStatus: ServerStatus;
  actions: ServerStatus;
};

export type ServerStatus = {
  notebook: Notebook | null;
  isNotebookRunning: boolean;
  forceRefresh: () => void;
};

/**
 * Types `content` to the desired type if the 2nd param is true.
 */
export const isField = <T extends AdminViewUserData[keyof AdminViewUserData]>(
  content: unknown,
  isFieldFlag: boolean,
): content is T => isFieldFlag;
