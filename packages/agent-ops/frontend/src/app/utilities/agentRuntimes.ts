export const getAgentRuntimeRowKey = (namespace: string, name: string): string =>
  `${encodeURIComponent(namespace)}/${encodeURIComponent(name)}`;
