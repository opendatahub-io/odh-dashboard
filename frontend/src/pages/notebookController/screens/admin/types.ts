import { Notebook } from '../../../../types';

export type User = {
  name: string;
  privilege: 'Admin' | 'User';
  lastActivity: number;
  serverStatus: { notebook?: Notebook; forceRefresh: () => void };
};

/**
 * Types `content` to the desired type if the 2nd param is true.
 */
export const isField = <T extends User[keyof User]>(
  content: unknown,
  isField: boolean,
): content is T => isField;
