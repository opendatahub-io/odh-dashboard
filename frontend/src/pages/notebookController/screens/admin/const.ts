import { User } from './types';

export const columnNames: { name: string; field: keyof User }[] = [
  { name: 'User', field: 'name' },
  { name: 'Last activity', field: 'lastActivity' },
  { name: 'Server status', field: 'serverStatus' },
];
