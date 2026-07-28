import * as React from 'react';
import type { CatalogLabelList, CatalogSourceList } from '~/app/modelCatalogTypes';
type CatalogPageLayoutProps = {
    catalogSources: CatalogSourceList | null;
    catalogLabels: CatalogLabelList | null;
    catalogSourcesLoaded: boolean;
    selectedSourceLabel: string | undefined;
    onSelectSourceLabel: (label: string) => void;
    isAllItemsView: boolean;
    emptyCategoryLabels?: Set<string>;
    setCategoryCount?: (count: number) => void;
    renderEmptyCategoriesState: () => React.ReactNode;
    renderFilterSidebar: () => React.ReactNode;
    renderToolbar: () => React.ReactNode;
    renderAllItemsView: () => React.ReactNode;
    renderGalleryView: (isSingleCategory: boolean, singleCategoryLabel: string | undefined) => React.ReactNode;
};
declare const CatalogPageLayout: React.FC<CatalogPageLayoutProps>;
export default CatalogPageLayout;
