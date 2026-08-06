// Deterministic cluster-internal URL matching mcp-lifecycle-operator's status.address.url
export const buildMcpAccessEndpointUrl = (
  name: string,
  namespace: string,
  port: number,
  path: string,
): string => `http://${name}.${namespace}.svc.cluster.local:${port}${path}`;
