import * as React from 'react';
/**
 * ODH-specific override of McpCatalogCoreLoader that includes admin user detection
 * for showing the appropriate action link in empty states:
 * - Admin users see "Go to MCP catalog sources" link
 * - Non-admin users see "Who's my administrator" link
 */
declare const OdhMcpCatalogCoreLoader: React.FC;
export default OdhMcpCatalogCoreLoader;
