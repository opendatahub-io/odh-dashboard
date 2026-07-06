import React from 'react';
type ModelCatalogPageProps = {
    searchTerm: string;
    handleFilterReset: () => void;
    isSingleCategory?: boolean;
    singleCategoryLabel?: string;
};
declare const ModelCatalogGalleryView: React.FC<ModelCatalogPageProps>;
export default ModelCatalogGalleryView;
