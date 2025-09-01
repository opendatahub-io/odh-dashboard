import * as React from 'react';
import { EmptyStateBody, EmptyStateVariant, EmptyState } from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import FeatureStoreDataSourceListView from './dataSourceTable/FeatureStoreDataSourceListView';
import FeatureStoreProjectSelectorNavigator from '../components/FeatureStoreProjectSelectorNavigator';
import { featureStoreRoute } from '../../routes';
import { useFeatureStoreProject } from '../../FeatureStoreContext';
import useFeatureStoreDataSources from '../../apiHooks/useFeastureStoreDataSources';

const title = 'Data Sources';
const description =
  'Select a workspace to view and manage its data sources. Data sources provide the raw data that feeds into your feature store.';

const DataSources: React.FC = () => {
  const { currentProject } = useFeatureStoreProject();
  const {
    data: dataSources,
    loaded: dataSourcesLoaded,
    error: dataSourcesLoadError,
  } = useFeatureStoreDataSources(currentProject);
  const emptyState = (
    <EmptyState
      headingLevel="h6"
      icon={SearchIcon}
      titleText="No data sources"
      variant={EmptyStateVariant.lg}
      data-testid="empty-state-title"
    >
      <EmptyStateBody data-testid="empty-state-body">
        No data sources have been found in this project.
      </EmptyStateBody>
    </EmptyState>
  );

  return (
    <ApplicationsPage
      empty={dataSources.dataSources.length === 0}
      emptyStatePage={emptyState}
      title={title}
      description={description}
      loadError={dataSourcesLoadError}
      loaded={dataSourcesLoaded}
      headerContent={
        <FeatureStoreProjectSelectorNavigator
          getRedirectPath={(featureStoreObject, featureStoreProject) =>
            featureStoreRoute(featureStoreObject, featureStoreProject)
          }
        />
      }
      provideChildrenPadding
    >
      <FeatureStoreDataSourceListView dataSources={dataSources} />
    </ApplicationsPage>
  );
};

export default DataSources;
