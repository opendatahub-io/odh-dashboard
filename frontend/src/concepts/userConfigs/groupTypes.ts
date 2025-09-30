export type GroupsConfig = {
  adminGroups: GroupStatus[];
  allowedGroups: GroupStatus[];
};

export enum GroupsConfigField {
  ADMIN = 'admin',
  USER = 'user',
}

export type GroupStatus = {
  id: string;
  name: string;
  enabled: boolean;
};
