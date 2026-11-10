export type NamespaceKind = {
  name: string;
  displayName?: string;
};

export type DatabaseProvider = 'milvus' | 'pgvector' | 'neo4j';

export type SecretListItem = {
  uuid: string;
  name: string;
  type?: string;
  data?: Record<string, string>;
  databaseProviders?: DatabaseProvider[];
  displayName?: string;
  description?: string;
};
