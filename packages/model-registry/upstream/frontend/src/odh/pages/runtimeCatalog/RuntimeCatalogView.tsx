import * as React from 'react';
import { ApplicationsPage } from 'mod-arch-shared';
import {
  Content,
  PageSection,
  Sidebar,
  SidebarContent,
  SidebarPanel,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { CatalogActiveFilters, CatalogSourceLabelSelector } from '~/app/shared/components/catalog';
import { useServingRuntimeFilterOptionList } from '~/odh/hooks/servingRuntimeCatalog/useServingRuntimeFilterOptionList';
import RuntimeCatalogFilters from '~/odh/pages/runtimeCatalog/components/RuntimeCatalogFilters';
import RuntimeCatalogGalleryView from '~/odh/pages/runtimeCatalog/components/RuntimeCatalogGalleryView';
import {
  RUNTIME_CATALOG_FILTER_CATEGORY_NAMES,
  RUNTIME_CATALOG_FILTER_KEYS,
  RUNTIME_CATALOG_LANDING_DESCRIPTION,
  RUNTIME_CATALOG_LANDING_TITLE,
  type RuntimeCatalogFiltersState,
} from '~/odh/pages/runtimeCatalog/const';
import { hasRuntimeCatalogFiltersApplied } from '~/odh/pages/runtimeCatalog/utils/runtimeCatalogUtils';

const RuntimeCatalogView: React.FC = () => {
  const [filters, setFilters] = React.useState<RuntimeCatalogFiltersState>({});
  const [searchQuery, setSearchQuery] = React.useState('');
  const [filterOptions, filterOptionsLoaded, filterOptionsLoadError] =
    useServingRuntimeFilterOptionList();

  const handleFilterChange = React.useCallback((key: string, values: string[]) => {
    setFilters((prev) => ({ ...prev, [key]: values }));
  }, []);

  const handleResetFilters = React.useCallback(() => {
    setFilters({});
    setSearchQuery('');
  }, []);

  const hasFiltersApplied = hasRuntimeCatalogFiltersApplied(filters, searchQuery);

  return (
    <ApplicationsPage
      noTitle
      title={RUNTIME_CATALOG_LANDING_TITLE}
      description={RUNTIME_CATALOG_LANDING_DESCRIPTION}
      empty={false}
      loaded
      provideChildrenPadding
    >
      <div data-testid="runtime-catalog-page">
        {/* Manual Sidebar layout — runtime catalog has no source categories so
            CatalogPageLayout (which requires catalogSources/catalogLabels) is not used. */}
        <Sidebar hasBorder hasGutter>
          <SidebarPanel variant="sticky" data-testid="runtime-catalog-sidebar">
            <RuntimeCatalogFilters
              filters={filters}
              onFilterChange={handleFilterChange}
              filterOptions={filterOptions}
              filterOptionsLoaded={filterOptionsLoaded}
              filterOptionsLoadError={filterOptionsLoadError}
            />
          </SidebarPanel>
          <SidebarContent>
            <Stack hasGutter>
              <StackItem>
                <Title headingLevel="h2" size="xl" data-testid="runtime-catalog-section-title">
                  {RUNTIME_CATALOG_LANDING_TITLE}
                </Title>
                <Content
                  component="p"
                  className="pf-v6-u-color-200 pf-v6-u-mt-sm"
                  data-testid="runtime-catalog-section-description"
                >
                  {RUNTIME_CATALOG_LANDING_DESCRIPTION}
                </Content>
              </StackItem>
              <CatalogSourceLabelSelector
                searchTerm={searchQuery}
                onSearch={setSearchQuery}
                onClearSearch={() => setSearchQuery('')}
                onResetAllFilters={handleResetFilters}
                hasFiltersApplied={hasFiltersApplied}
                searchPlaceholder="Search by name or description"
                searchInputTestId="runtime-catalog-search-input"
                searchButtonTestId="runtime-catalog-search-button"
                renderActiveFilters={() => (
                  <CatalogActiveFilters
                    filterKeys={[...RUNTIME_CATALOG_FILTER_KEYS]}
                    categoryNames={RUNTIME_CATALOG_FILTER_CATEGORY_NAMES}
                    filters={filters}
                    setFilters={setFilters}
                    testIdPrefix="runtime-catalog-filter"
                  />
                )}
              />
              <PageSection
                isFilled
                padding={{ default: 'noPadding' }}
                data-testid="runtime-catalog-gallery-section"
              >
                <RuntimeCatalogGalleryView
                  filters={filters}
                  searchQuery={searchQuery}
                  filterOptionsLoaded={filterOptionsLoaded}
                  onResetFilters={handleResetFilters}
                />
              </PageSection>
            </Stack>
          </SidebarContent>
        </Sidebar>
      </div>
    </ApplicationsPage>
  );
};

export default RuntimeCatalogView;
