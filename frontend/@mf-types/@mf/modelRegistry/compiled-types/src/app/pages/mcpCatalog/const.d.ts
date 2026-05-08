import type { McpFilterCategoryKey } from '~/app/pages/mcpCatalog/types/mcpCatalogFilterOptions';
export declare const MCP_CATALOG_TITLE = "MCP Catalog";
export declare const MCP_CATALOG_DESCRIPTION = "Browse and deploy MCP servers provided by Red Hat partners and other providers.";
export declare const MCP_CATALOG_GALLERY: {
    readonly CARDS_PER_ROW: 4;
    readonly PAGE_SIZE: 10;
    readonly SECTION_TITLE: "MCP Servers";
};
type GridSpan = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export declare const MCP_CATALOG_GRID_SPAN: {
    sm: GridSpan;
    md: GridSpan;
    lg: GridSpan;
    xl2: GridSpan;
};
export declare const MCP_FILTER_CATEGORY_NAMES: Record<McpFilterCategoryKey, string>;
export declare const MCP_FILTER_KEYS: McpFilterCategoryKey[];
export declare const BACKEND_TO_FRONTEND_FILTER_KEY: Record<string, McpFilterCategoryKey>;
export declare const OTHER_MCP_SERVERS_DISPLAY_NAME = "Other MCP servers";
export {};
