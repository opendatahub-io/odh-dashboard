import React from 'react';
type ModelCatalogSourceLabelSelectorProps = {
    searchTerm?: string;
    onSearch?: (term: string) => void;
    onClearSearch?: () => void;
    onResetAllFilters?: () => void;
};
declare const ModelCatalogSourceLabelSelector: React.FC<ModelCatalogSourceLabelSelectorProps>;
export default ModelCatalogSourceLabelSelector;
