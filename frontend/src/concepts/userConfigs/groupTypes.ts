export type GroupValues = {
  adminGroups: GroupStatus[];
  allowedGroups: GroupStatus[];
};

export type GroupsConfig = GroupValues & {
  errorAdmin?: string;
  errorUser?: string;
};

export enum GroupsConfigField {
  ADMIN = 'admin',
  USER = 'user',
}

export type GroupStatus = {
  id: number | string;
  name: string;
  enabled: boolean;
};
