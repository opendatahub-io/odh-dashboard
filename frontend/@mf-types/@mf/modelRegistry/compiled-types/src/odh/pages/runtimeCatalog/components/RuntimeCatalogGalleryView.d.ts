import * as React from 'react';
import { type RuntimeCatalogFiltersState } from '~/odh/pages/runtimeCatalog/const';
type RuntimeCatalogGalleryViewProps = {
    selectedSourceLabel?: string;
    filters: RuntimeCatalogFiltersState;
    searchQuery: string;
    filterOptionsLoaded: boolean;
    onResetFilters: () => void;
};
declare const RuntimeCatalogGalleryView: React.FC<RuntimeCatalogGalleryViewProps>;
export default RuntimeCatalogGalleryView;
