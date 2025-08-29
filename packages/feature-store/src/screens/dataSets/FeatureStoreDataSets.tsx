import React from 'react';
import { EmptyStateBody, EmptyStateVariant, EmptyState } from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import FeatureStoreDataSetsListView from './DataSetTable/FeatureStoreDatasetListView';
import FeatureStoreProjectSelectorNavigator from '../components/FeatureStoreProjectSelectorNavigator';
import { useFeatureStoreProject } from '../../FeatureStoreContext';

import { featureStoreRoute } from '../../routes';
import useFeatureStoreDataSets from '../../apiHooks/useFeatureStoreDataSets';

const title = 'Datasets';
const description =
  'View and manage datasets created from feature services. Each dataset captures a snapshot of feature values at a specific point in time.';

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
        No data sets have been found in this project.
      </EmptyStateBody>
    </EmptyState>
  );

  return (
    <ApplicationsPage
      empty={dataSets.savedDatasets.length === 0}
      emptyStatePage={emptyState}
      title={title}
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
