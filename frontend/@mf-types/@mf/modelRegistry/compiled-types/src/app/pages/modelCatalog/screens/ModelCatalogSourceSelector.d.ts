import React from 'react';
type ModelCatalogSourceSelectorProps = {
    sourceId: string;
    onSelection: (sourceId: string) => void;
    searchTerm?: string;
    onSearch?: (term: string) => void;
    onClearSearch?: () => void;
    primary?: boolean;
};
declare const ModelCatalogSourceSelector: React.FC<ModelCatalogSourceSelectorProps>;
export default ModelCatalogSourceSelector;
