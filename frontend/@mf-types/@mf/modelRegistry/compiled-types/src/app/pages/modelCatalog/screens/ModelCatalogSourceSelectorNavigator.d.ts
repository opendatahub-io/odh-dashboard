import React from 'react';
type ModelCatalogSourceSelectorNavigatorProps = {
    getRedirectPath: (sourceId: string) => string;
    searchTerm?: string;
    onSearch?: (term: string) => void;
    onClearSearch?: () => void;
    isPrimary?: boolean;
};
declare const ModelCatalogSourceSelectorNavigator: React.FC<ModelCatalogSourceSelectorNavigatorProps>;
export default ModelCatalogSourceSelectorNavigator;
