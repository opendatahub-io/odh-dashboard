import React from 'react';
import { EmptyStateBody, EmptyStateVariant, EmptyState } from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import FeatureStoreDataSetsListView from './DataSetTable/FeatureStoreDatasetListView';
import FeatureStoreProjectSelectorNavigator from '../components/FeatureStoreProjectSelectorNavigator';
import FeatureStorePageTitle from '../../components/FeatureStorePageTitle';
import { useFeatureStoreProject } from '../../FeatureStoreContext';
import { featureStoreRoute } from '../../routes';
import useFeatureStoreDataSets from '../../apiHooks/useFeatureStoreDataSets';
import FeatureStoreObjectIcon from '../../components/FeatureStoreObjectIcon';
import FeatureStoreAccessDenied from '../../components/FeatureStoreAccessDenied';
import { getFeatureStoreObjectDescription } from '../../utils';
import { FeatureStoreObject } from '../../const';

const title = 'Datasets';

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
        Select a different feature store or create a dataset in a workbench.
      </EmptyStateBody>
    </EmptyState>
  );

  return (
    <ApplicationsPage
      empty={dataSets.savedDatasets.length === 0}
      emptyStatePage={emptyState}
      loadErrorPage={
        <FeatureStoreAccessDenied resourceType="data sets" projectName={currentProject} />
      }
      title={
        <FeatureStorePageTitle
          title={
            <FeatureStoreObjectIcon
              objectType="data_set"
              title={title}
              showBackground
              useTypedColors
            />
          }
        />
      }
      description={getFeatureStoreObjectDescription(FeatureStoreObject.DATA_SETS)}
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
