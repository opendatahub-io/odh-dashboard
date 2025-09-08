import React from 'react';
import { EmptyStateBody, EmptyStateVariant, EmptyState } from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import FeatureStoreDataSetsListView from './DataSetTable/FeatureStoreDatasetListView';
import FeatureStoreProjectSelectorNavigator from '../components/FeatureStoreProjectSelectorNavigator';
import FeatureStorePageTitle from '../../components/FeatureStorePageTitle';
import { useFeatureStoreProject } from '../../FeatureStoreContext';
import { featureStoreRoute } from '../../routes';
import useFeatureStoreDataSets from '../../apiHooks/useFeatureStoreDataSets';

const title = 'Datasets';
const description =
  'View and manage datasets created from feature services. Datasets are point-in-time-correct snapshots of feature services,data and are used for training,  or validation, and analysis.';

const FeatureStoreDataSets = (): React.ReactElement => {
  const { currentProject } = useFeatureStoreProject();

  const {
    data: dataSets,
    loaded: dataSetsLoaded,
    error: dataSetsLoadError,
  } = useFeatureStoreDataSets(currentProject);

  const emptyState = (
    <EmptyState
      headingLevel="h6"
      icon={SearchIcon}
      titleText="No data sets"
      variant={EmptyStateVariant.lg}
      data-testid="empty-state-title"
    >
      <EmptyStateBody data-testid="empty-state-body">
        Select a different feature store repository or create a data sets in a workbench.
      </EmptyStateBody>
    </EmptyState>
  );

  return (
    <ApplicationsPage
      empty={dataSets.savedDatasets.length === 0}
      emptyStatePage={emptyState}
      title={<FeatureStorePageTitle title={title} currentProject={currentProject ?? undefined} />}
      description={description}
      loadError={dataSetsLoadError}
      loaded={dataSetsLoaded}
      headerContent={
        <FeatureStoreProjectSelectorNavigator
          getRedirectPath={(featureStoreObject, featureStoreProject) =>
            featureStoreRoute(featureStoreObject, featureStoreProject)
          }
        />
      }
      provideChildrenPadding
    >
      <FeatureStoreDataSetsListView dataSets={dataSets} />
    </ApplicationsPage>
  );
};

export default FeatureStoreDataSets;
