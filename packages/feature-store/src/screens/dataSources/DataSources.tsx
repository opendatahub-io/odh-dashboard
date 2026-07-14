import * as React from 'react';
import { Flex } from '@patternfly/react-core';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import FeatureStoreDataSourceListView from './dataSourceTable/FeatureStoreDataSourceListView';
import FeatureStoreProjectSelectorNavigator from '../components/FeatureStoreProjectSelectorNavigator';
import { featureStoreRoute } from '../../routes';
import { useFeatureStoreProject } from '../../FeatureStoreContext';
import useFeatureStoreDataSources from '../../apiHooks/useFeatureStoreDataSources';
import FeatureStorePageTitle from '../../components/FeatureStorePageTitle';
import FeatureStoreObjectIcon from '../../components/FeatureStoreObjectIcon';
import FeatureStoreAccessDenied from '../../components/FeatureStoreAccessDenied';
import ConnectedWorkbenchesLink from '../../components/ConnectedWorkbenchesLink';
import { FeatureStoreEmptyState } from '../components/EmptyStateFeatureStore';

const title = 'Data sources';
const description =
  'Select a feature store to view and manage its data sources. Data sources provide the raw data that feeds into your feature store.';

const DataSources: React.FC = () => {
  const { currentProject } = useFeatureStoreProject();
  const {
    data: dataSources,
    loaded: dataSourcesLoaded,
    error: dataSourcesLoadError,
  } = useFeatureStoreDataSources(currentProject);
  const emptyState = (
    <FeatureStoreEmptyState resourceTypeSingular="data source" resourceTypePlural="data sources" />
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
        <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapMd' }}>
          <FeatureStoreProjectSelectorNavigator
            getRedirectPath={(featureStoreObject, featureStoreProject) =>
              featureStoreRoute(featureStoreObject, featureStoreProject)
            }
          />
          <ConnectedWorkbenchesLink />
        </Flex>
      }
      provideChildrenPadding
    >
      <FeatureStoreDataSourceListView dataSources={dataSources} />
    </ApplicationsPage>
  );
};

export default DataSources;
