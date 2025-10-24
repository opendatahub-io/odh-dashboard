import * as React from 'react';
import { EmptyStateBody, EmptyStateVariant, EmptyState } from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import FeatureStoreDataSourceListView from './dataSourceTable/FeatureStoreDataSourceListView';
import FeatureStoreProjectSelectorNavigator from '../components/FeatureStoreProjectSelectorNavigator';
import { featureStoreRoute } from '../../routes';
import { useFeatureStoreProject } from '../../FeatureStoreContext';
import useFeatureStoreDataSources from '../../apiHooks/useFeatureStoreDataSources';
import FeatureStorePageTitle from '../../components/FeatureStorePageTitle';
import FeatureStoreObjectIcon from '../../components/FeatureStoreObjectIcon';
import FeatureStoreAccessDenied from '../../components/FeatureStoreAccessDenied';

const title = 'Data sources';
const description =
  'Select a feature store repository to view and manage its data sources. Data sources provide the raw data that feeds into your feature store.';

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
        Select a different feature store repository or create a data sources in a workbench.
      </EmptyStateBody>
    </EmptyState>
  );

  return (
    <ApplicationsPage
      empty={dataSources.dataSources.length === 0}
      emptyStatePage={emptyState}
      loadErrorPage={
        <FeatureStoreAccessDenied resourceType="data sources" projectName={currentProject} />
      }
      title={
        <FeatureStorePageTitle
          title={
            <FeatureStoreObjectIcon
              objectType="data_source"
              title={title}
              showBackground
              useTypedColors
            />
          }
        />
      }
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
