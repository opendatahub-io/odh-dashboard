import React from 'react';
import { EmptyStateBody, EmptyStateVariant, EmptyState } from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import FeatureStoreProjectSelectorNavigator from '#~/pages/featureStore/screens/components/FeatureStoreProjectSelectorNavigator';
import { useFeatureStoreProject } from '#~/pages/featureStore/FeatureStoreContext';
import useFeatureServices from '#~/pages/featureStore/apiHooks/useFeatureServices';
import { featureStoreRoute } from '#~/pages/featureStore/routes';
import FeatureServicesListView from './FeatureServicesListView';

const title = 'Feature services';
const description =
  'Select a workspace to view and manage its feature services. Feature services are curated groups of related features designed to be retrieved together for model training or online inference.';

const FeatureServices = (): React.ReactElement => {
  const { currentProject } = useFeatureStoreProject();
  const {
    data: featureServices,
    loaded: featureServicesLoaded,
    error: featureServicesLoadError,
  } = useFeatureServices(currentProject);

  const emptyState = (
    <EmptyState
      headingLevel="h6"
      icon={SearchIcon}
      titleText="No feature services"
      variant={EmptyStateVariant.lg}
      data-testid="empty-state-title"
    >
      <EmptyStateBody data-testid="empty-state-body">
        No feature services have been found in this project.
      </EmptyStateBody>
    </EmptyState>
  );

  return (
    <ApplicationsPage
      empty={featureServices.featureServices.length === 0}
      emptyStatePage={emptyState}
      title={title}
      description={description}
      loadError={featureServicesLoadError}
      loaded={featureServicesLoaded}
      headerContent={
        <FeatureStoreProjectSelectorNavigator
          getRedirectPath={(featureStoreObject, featureStoreProject) =>
            featureStoreRoute(featureStoreObject, featureStoreProject)
          }
        />
      }
      provideChildrenPadding
    >
      <FeatureServicesListView
        featureServices={featureServices.featureServices}
        fsProject={currentProject}
      />
    </ApplicationsPage>
  );
};

export default FeatureServices;
