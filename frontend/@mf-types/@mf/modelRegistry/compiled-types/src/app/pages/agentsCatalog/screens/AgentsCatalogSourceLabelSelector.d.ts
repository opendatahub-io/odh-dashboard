import * as React from 'react';
type AgentsCatalogSourceLabelSelectorProps = {
    searchTerm: string;
    onSearch: (term: string) => void;
    onClearSearch: () => void;
    onResetAllFilters: () => void;
};
declare const AgentsCatalogSourceLabelSelector: React.FC<AgentsCatalogSourceLabelSelectorProps>;
export default AgentsCatalogSourceLabelSelector;
