import * as React from 'react';
import { PageSection, Sidebar, SidebarContent, SidebarPanel, Stack } from '@patternfly/react-core';
import type { CatalogLabelList, CatalogSourceList } from '~/app/modelCatalogTypes';
import { getActiveSourceLabels } from '~/app/pages/modelCatalog/utils/modelCatalogUtils';
import ScrollViewOnMount from '~/app/shared/components/ScrollViewOnMount';

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
  renderGalleryView: (
    isSingleCategory: boolean,
    singleCategoryLabel: string | undefined,
  ) => React.ReactNode;
};

const CatalogPageLayout: React.FC<CatalogPageLayoutProps> = ({
  catalogSources,
  catalogLabels,
  catalogSourcesLoaded,
  selectedSourceLabel,
  onSelectSourceLabel,
  isAllItemsView,
  emptyCategoryLabels,
  setCategoryCount,
  renderEmptyCategoriesState,
  renderFilterSidebar,
  renderToolbar,
  renderAllItemsView,
  renderGalleryView,
}) => {
  const activeCategories = React.useMemo(
    () => getActiveSourceLabels(catalogSources, catalogLabels),
    [catalogSources, catalogLabels],
  );

  const effectiveCategories = React.useMemo(
    () =>
      emptyCategoryLabels
        ? activeCategories.filter((c) => !emptyCategoryLabels.has(c))
        : activeCategories,
    [activeCategories, emptyCategoryLabels],
  );

  React.useEffect(() => {
    if (catalogSourcesLoaded && setCategoryCount) {
      setCategoryCount(activeCategories.length);
    }
  }, [catalogSourcesLoaded, activeCategories.length, setCategoryCount]);

  const isSingleCategory = effectiveCategories.length === 1;
  const hasNoCategories = effectiveCategories.length === 0;

  React.useEffect(() => {
    if (
      catalogSourcesLoaded &&
      isSingleCategory &&
      selectedSourceLabel !== effectiveCategories[0]
    ) {
      onSelectSourceLabel(effectiveCategories[0]);
    }
  }, [
    catalogSourcesLoaded,
    isSingleCategory,
    effectiveCategories,
    selectedSourceLabel,
    onSelectSourceLabel,
  ]);

  if (catalogSourcesLoaded && hasNoCategories) {
    return (
      <>
        <ScrollViewOnMount shouldScroll scrollToTop />
        {renderEmptyCategoriesState()}
      </>
    );
  }

  return (
    <>
      <ScrollViewOnMount shouldScroll scrollToTop />
      <Sidebar hasBorder hasGutter>
        <SidebarPanel variant="sticky">{renderFilterSidebar()}</SidebarPanel>
        <SidebarContent>
          <Stack hasGutter>
            {renderToolbar()}
            <PageSection isFilled padding={{ default: 'noPadding' }}>
              {isAllItemsView && !isSingleCategory
                ? renderAllItemsView()
                : renderGalleryView(
                    isSingleCategory,
                    isSingleCategory ? effectiveCategories[0] : undefined,
                  )}
            </PageSection>
          </Stack>
        </SidebarContent>
      </Sidebar>
    </>
  );
};

export default CatalogPageLayout;
