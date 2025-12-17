import React from 'react';
import { CatalogSourceList } from '~/app/modelCatalogTypes';
type CategorySectionProps = {
    label: string;
    searchTerm: string;
    pageSize: number;
    catalogSources: CatalogSourceList | null;
    onShowMore: (label: string) => void;
    displayName?: string;
};
declare const CatalogCategorySection: React.FC<CategorySectionProps>;
export default CatalogCategorySection;
