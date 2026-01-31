import React from 'react';
import { EmptyStateBody, EmptyStateVariant, EmptyState } from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import FeatureServicesListView from './FeatureServicesListView';
import FeatureStoreProjectSelectorNavigator from '../components/FeatureStoreProjectSelectorNavigator';
import FeatureStorePageTitle from '../../components/FeatureStorePageTitle';
import { useFeatureStoreProject } from '../../FeatureStoreContext';
import useFeatureServices from '../../apiHooks/useFeatureServices';
import { featureStoreRoute } from '../../routes';
import FeatureStoreObjectIcon from '../../components/FeatureStoreObjectIcon';
import FeatureStoreAccessDenied from '../../components/FeatureStoreAccessDenied';

const title = 'Feature services';
const description =
  'Select a feature store to view its feature services. Feature services are groups of related features from one or more feature views that are designed to be retrieved together for model training, online inference, or GenAI applications like RAG.';

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
        Select a different feature store or create a feature service in a workbench.
      </EmptyStateBody>
    </EmptyState>
  );

  return (
    <ApplicationsPage
      empty={featureServices.featureServices.length === 0}
      emptyStatePage={emptyState}
      title={
        <FeatureStorePageTitle
          title={
            <FeatureStoreObjectIcon
              objectType="feature_service"
              title={title}
              showBackground
              useTypedColors
            />
          }
        />
      }
      description={description}
      loadErrorPage={
        <FeatureStoreAccessDenied resourceType="feature services" projectName={currentProject} />
      }
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
      <FeatureServicesListView featureServices={featureServices} fsProject={currentProject} />
    </ApplicationsPage>
  );
};

export default FeatureServices;
