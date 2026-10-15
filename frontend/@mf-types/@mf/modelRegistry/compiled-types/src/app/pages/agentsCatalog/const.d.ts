import type { AgentFilterCategoryKey } from '~/app/pages/agentsCatalog/types/agentsCatalogFilterOptions';
export declare const AGENTS_CATALOG_TITLE = "Agents Catalog";
export declare const AGENTS_CATALOG_DESCRIPTION = "Discover agent templates that are available for your organization.";
export declare const AGENT_FILTER_KEYS: AgentFilterCategoryKey[];
export declare const AGENT_FILTER_CATEGORY_NAMES: Record<AgentFilterCategoryKey, string>;
export declare const AGENT_FRAMEWORK_LABEL_MAPPING: Record<string, string>;
export declare const AGENT_LABEL_MAPPINGS: Record<string, Record<string, string>>;
export declare const BACKEND_TO_FRONTEND_AGENT_FILTER_KEY: Record<string, AgentFilterCategoryKey>;
export declare const AGENTS_CATALOG_GALLERY: {
    readonly CARDS_PER_ROW: 4;
    readonly PAGE_SIZE: 10;
};
type GridSpan = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
export declare const AGENTS_CATALOG_GRID_SPAN: {
    sm: GridSpan;
    md: GridSpan;
    lg: GridSpan;
    xl2: GridSpan;
};
export declare const OTHER_AGENTS_DISPLAY_NAME = "Other agents";
export {};
