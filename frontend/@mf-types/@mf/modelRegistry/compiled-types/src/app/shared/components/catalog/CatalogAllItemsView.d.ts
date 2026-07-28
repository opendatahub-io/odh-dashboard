import React from 'react';
import type { CatalogLabelList, CatalogSourceList } from '~/app/modelCatalogTypes';
type CatalogAllItemsViewProps = {
    searchTerm: string;
    catalogSources: CatalogSourceList | null;
    catalogLabels: CatalogLabelList | null;
    pageSize?: number;
    otherSectionKey?: string;
    onShowMore: (label: string) => void;
    renderCategorySection: (label: string, searchTerm: string, pageSize: number, onShowMore: (label: string) => void) => React.ReactNode;
};
declare const CatalogAllItemsView: React.FC<CatalogAllItemsViewProps>;
export default CatalogAllItemsView;
