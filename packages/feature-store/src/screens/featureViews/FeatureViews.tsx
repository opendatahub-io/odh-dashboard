import React from 'react';
import { EmptyStateBody, EmptyStateVariant, EmptyState } from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import FeatureViewsListView from './FeatureViewsListView';
import FeatureStoreProjectSelectorNavigator from '../components/FeatureStoreProjectSelectorNavigator';
import FeatureStorePageTitle from '../../components/FeatureStorePageTitle';
import { useFeatureStoreProject } from '../../FeatureStoreContext';
import useFeatureViews from '../../apiHooks/useFeatureViews';
import { featureStoreRoute } from '../../routes';

const title = 'Feature views';
const description =
  'Select a feature store repository to view and manage its feature views. A feature view defines how to retrieve a logical group of features from a specific data source. It binds a data source to one or more entities and contains the logic for transforming the raw data into feature values.';

const FeatureViews = (): React.ReactElement => {
  const { currentProject } = useFeatureStoreProject();
  const {
    data: featureViews,
    loaded: featureViewsLoaded,
    error: featureViewsLoadError,
  } = useFeatureViews({ project: currentProject });

  const emptyState = (
    <EmptyState
      headingLevel="h6"
      icon={SearchIcon}
      titleText="No feature views"
      variant={EmptyStateVariant.lg}
      data-testid="empty-state-title"
    >
      <EmptyStateBody data-testid="empty-state-body">
        Select a different feature store repository or create a feature views in a workbench.
      </EmptyStateBody>
    </EmptyState>
  );

  return (
    <ApplicationsPage
      empty={featureViews.featureViews.length === 0}
      emptyStatePage={emptyState}
      title={<FeatureStorePageTitle title={title} />}
      description={description}
      loadError={featureViewsLoadError}
      loaded={featureViewsLoaded}
      headerContent={
        <FeatureStoreProjectSelectorNavigator
          getRedirectPath={(featureStoreObject, featureStoreProject) =>
            featureStoreRoute(featureStoreObject, featureStoreProject)
          }
        />
      }
      provideChildrenPadding
    >
      <FeatureViewsListView featureViews={featureViews} fsProject={currentProject} />
    </ApplicationsPage>
  );
};

export default FeatureViews;
