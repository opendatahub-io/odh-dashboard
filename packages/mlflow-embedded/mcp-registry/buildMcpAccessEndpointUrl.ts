// Deterministic cluster-internal URL matching mcp-lifecycle-operator's status.address.url.
// `path` comes from the deployment's applied spec.config.path, which is user-authored YAML;
// require it to stay on the service's own origin so it can't smuggle a different
// host/userinfo (e.g. "@169.254.169.254/") into the resulting URL (CWE-918 SSRF).
export const buildMcpAccessEndpointUrl = (
  name: string,
  namespace: string,
  port: number,
  path: string,
): string => {
  const serviceUrl = new URL(`http://${name}.${namespace}.svc.cluster.local:${port}`);
  const endpointUrl = new URL(path, serviceUrl);

  if (!path.startsWith('/') || endpointUrl.origin !== serviceUrl.origin) {
    throw new Error('MCP endpoint path must remain on the deployed service');
  }

  return endpointUrl.toString();
};
