import React from 'react';
import { EmptyStateBody, EmptyStateVariant, EmptyState } from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import FeatureStoreProjectSelectorNavigator from '#~/pages/featureStore/screens/components/FeatureStoreProjectSelectorNavigator';
import { useFeatureStoreProject } from '#~/pages/featureStore/FeatureStoreContext';
import useFeatureViews from '#~/pages/featureStore/apiHooks/useFeatureViews';
import { featureStoreRoute } from '#~/pages/featureStore/routes';
import FeatureViewsListView from './FeatureViewsListView';

const title = 'Feature views';
const description =
  'Select a feature store workspace to view and manage its feature views. A feature view defines a group of related features and how to retrieve them from a data source over time.';

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
        No feature views have been found in this project.
      </EmptyStateBody>
    </EmptyState>
  );

  return (
    <ApplicationsPage
      empty={featureViews.featureViews.length === 0}
      emptyStatePage={emptyState}
      title={title}
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
