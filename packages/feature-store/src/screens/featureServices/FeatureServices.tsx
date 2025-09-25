import React from 'react';
import { EmptyStateBody, EmptyStateVariant, EmptyState } from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import FeatureServicesListView from './FeatureServicesListView';
import FeatureStoreProjectSelectorNavigator from '../components/FeatureStoreProjectSelectorNavigator';
import FeatureStorePageTitle from '../../components/FeatureStorePageTitle';
import { useFeatureStoreProject } from '../../FeatureStoreContext';
import useFeatureServices from '../../apiHooks/useFeatureServices';
import { featureStoreRoute } from '../../routes';
import FeatureStoreObjectIcon from '../../components/FeatureStoreObjectIcon';

const title = 'Feature services';
const description =
  "Select a feature store repository to view and manage its feature services. Feature services groups features from across one or more Feature views to serve a specific model's needs for training, inference, or GenAI applications like RAG. Feature service acts as a managed API for a model, ensuring features are served consistently.";

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
        Select a different feature store repository or create a feature services in a workbench.
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
