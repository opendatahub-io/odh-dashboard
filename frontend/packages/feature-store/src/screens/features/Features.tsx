import React from 'react';
import { EmptyStateBody, EmptyStateVariant, EmptyState } from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import FeaturesList from './FeaturesList';
import { useFeatureStoreProject } from '../../FeatureStoreContext';
import { featureStoreRoute } from '../../FeatureStoreRoutes';
import useFeatures from '../../apiHooks/useFeatures';
import FeatureStoreProjectSelectorNavigator from '../components/FeatureStoreProjectSelectorNavigator';

const title = 'Features';
const description =
  'Select a feature store to view its features. A feature is a schema containing a name and a type, and is used to represent the data stored in feature views for both training and serving purposes.';
const Features = (): React.ReactElement => {
  const { currentProject } = useFeatureStoreProject();
  const {
    data: features,
    loaded: featuresLoaded,
    error: featuresLoadError,
  } = useFeatures(currentProject);

  const emptyState = (
    <EmptyState
      headingLevel="h6"
      icon={SearchIcon}
      titleText="No features"
      variant={EmptyStateVariant.lg}
      data-testid="empty-state-title"
    >
      <EmptyStateBody data-testid="empty-state-body">
        No features have been found in this project.
      </EmptyStateBody>
    </EmptyState>
  );

  return (
    <ApplicationsPage
      empty={features.features.length === 0}
      emptyStatePage={emptyState}
      title={title}
      description={description}
      loadError={featuresLoadError}
      loaded={featuresLoaded}
      headerContent={
        <FeatureStoreProjectSelectorNavigator
          getRedirectPath={(featureStoreObject, featureStoreProject) =>
            featureStoreRoute(featureStoreObject, featureStoreProject)
          }
        />
      }
      provideChildrenPadding
    >
      <FeaturesList features={features.features} fsProject={currentProject} />
    </ApplicationsPage>
  );
};

export default Features;
