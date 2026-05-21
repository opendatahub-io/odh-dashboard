import type { McpFilterCategoryKey } from '~/app/pages/mcpCatalog/types/mcpCatalogFilterOptions';
export declare function useMcpFilterState(filterKey: McpFilterCategoryKey): {
    selectedValues: string[];
    setSelected: (value: string, checked: boolean) => void;
    isSelected: (value: string) => boolean;
};
