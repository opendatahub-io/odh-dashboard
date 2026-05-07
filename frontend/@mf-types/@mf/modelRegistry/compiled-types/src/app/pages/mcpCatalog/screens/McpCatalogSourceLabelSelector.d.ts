import * as React from 'react';
type McpCatalogSourceLabelSelectorProps = {
    searchTerm: string;
    onSearch: (term: string) => void;
    onClearSearch: () => void;
    onResetAllFilters: () => void;
};
declare const McpCatalogSourceLabelSelector: React.FC<McpCatalogSourceLabelSelectorProps>;
export default McpCatalogSourceLabelSelector;
