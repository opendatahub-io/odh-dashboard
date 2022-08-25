export type GroupsConfig = {
  adminGroups: GroupStatus[];
  allowedGroups: GroupStatus[];
  errorAdmin?: string;
  errorUser?: string;
};

export enum GroupsConfigField {
  ADMIN,
  USER,
}

export type GroupStatus = {
  id: number;
  name: string;
  enabled: boolean;
};

export type MenuItemStatus = {
  id: number;
  name: string;
  enabled: boolean;
};
