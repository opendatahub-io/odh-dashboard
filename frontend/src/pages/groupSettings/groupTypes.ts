export type GroupsConfig = {
  adminGroups: GroupStatus[];
  allowedGroups: GroupStatus[];
  errorAdmin?: string;
  errorUser?: string;
};

export enum GroupsConfigField {
  ADMIN = 'admin',
  USER = 'user',
}

export type GroupStatus = {
  id: number;
  name: string;
  enabled: boolean;
};
