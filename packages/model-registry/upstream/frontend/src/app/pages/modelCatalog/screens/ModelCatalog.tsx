import * as React from 'react';
import { PageSection, Sidebar, SidebarContent, SidebarPanel, Stack, StackItem } from '@patternfly/react-core';
import { ApplicationsPage, ProjectObjectType, TitleWithIcon } from 'mod-arch-shared';
import { LazyCodeRefComponent, useExtensions } from '@odh-dashboard/plugin-core';
import { isModelCatalogBannerExtension } from '~/odh/extension-points';
import ScrollViewOnMount from '~/app/shared/components/ScrollViewOnMount';
import ModelCatalogFilters from '~/app/pages/modelCatalog/components/ModelCatalogFilters';
import { ModelCatalogContext } from '~/app/context/modelCatalog/ModelCatalogContext';
import { hasFiltersApplied } from '~/app/pages/modelCatalog/utils/modelCatalogUtils';
import {
  ModelCatalogNumberFilterKey,
  ModelCatalogStringFilterKey,
} from '~/concepts/modelCatalog/const';
import { CategoryName } from '~/app/modelCatalogTypes';
import ModelCatalogSourceLabelSelectorNavigator from './ModelCatalogSourceLabelSelectorNavigator';
import ModelCatalogAllModelsView from './ModelCatalogAllModelsView';
import ModelCatalogGalleryView from './ModelCatalogGalleryView';

const ModelCatalog: React.FC = () => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const { selectedSourceLabel, filterData, setFilterData } = React.useContext(ModelCatalogContext);
  const filtersApplied = hasFiltersApplied(filterData);
  const isAllModelsView =
    selectedSourceLabel === CategoryName.allModels && !searchTerm && !filtersApplied;

  const bannerExtensions = useExtensions(isModelCatalogBannerExtension);
  
  const handleSearch = React.useCallback((term: string) => {
    setSearchTerm(term);
  }, []);

  const handleClearSearch = React.useCallback(() => {
    setSearchTerm('');
  }, []);

  const resetAllFilters = React.useCallback(() => {
    Object.values(ModelCatalogStringFilterKey).forEach((filterKey) => {
      setFilterData(filterKey, []);
    });

    Object.values(ModelCatalogNumberFilterKey).forEach((filterKey) => {
      setFilterData(filterKey, undefined);
    });
  }, [setFilterData]);

  const handleFilterReset = React.useCallback(() => {
    setSearchTerm('');
    resetAllFilters();
  }, [resetAllFilters]);

  return (
    <>
      <ScrollViewOnMount shouldScroll scrollToTop />
      <ApplicationsPage
        title={<TitleWithIcon title="Catalog" objectType={ProjectObjectType.modelCatalog} />}
        description="Discover models that are available for your organization to register, deploy, and customize."
        empty={false}
        loaded
        provideChildrenPadding
      >
        <Stack hasGutter>
          {bannerExtensions.map((extension) => (
            <StackItem key={extension.properties.id}>
              <LazyCodeRefComponent component={extension.properties.component} />
            </StackItem>
          ))}
          <StackItem>
            <Sidebar hasBorder hasGutter>
              <SidebarPanel>
                <ModelCatalogFilters />
              </SidebarPanel>
              <SidebarContent>
                <ModelCatalogSourceLabelSelectorNavigator
                  searchTerm={searchTerm}
                  onSearch={handleSearch}
                  onClearSearch={handleClearSearch}
                />
                <PageSection isFilled padding={{ default: 'noPadding' }}>
                  {isAllModelsView ? (
                    <ModelCatalogAllModelsView searchTerm={searchTerm} />
                  ) : (
                    <ModelCatalogGalleryView
                      searchTerm={searchTerm}
                      handleFilterReset={handleFilterReset}
                    />
                  )}
                </PageSection>
              </SidebarContent>
            </Sidebar>
          </StackItem>
        </Stack>
      </ApplicationsPage>
    </>
  );
};

export default ModelCatalog;
