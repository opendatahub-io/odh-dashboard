export type NamespaceKind = {
  name: string;
  displayName?: string;
};

export type SecretListItem = {
  uuid: string;
  name: string;
  type?: string;
  data?: Record<string, string>;
  displayName?: string;
  description?: string;
};
