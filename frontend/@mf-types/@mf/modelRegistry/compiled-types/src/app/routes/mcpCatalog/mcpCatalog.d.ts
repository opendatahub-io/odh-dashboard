export declare const mcpCatalogUrl: () => string;
export declare const mcpServerDetailsUrl: (serverId: string | number) => string;
export declare const mcpDeploymentsUrl: (namespace?: string) => string;
export declare const mcpRegistryUrl: () => string;
/** Links to an MCP Registry server's detail page, optionally deep-linking to a
 * specific version via the `version` query param. */
export declare const mcpRegistryServerDetailUrl: (serverName: string, namespace?: string, version?: string) => string;
