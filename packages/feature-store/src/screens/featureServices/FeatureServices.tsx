import React from 'react';
import { EmptyStateBody, EmptyStateVariant, EmptyState, Flex } from '@patternfly/react-core';
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
import { getFeatureStoreObjectDescription } from '../../utils';
import { FeatureStoreObject } from '../../const';
import ConnectedWorkbenchesLink from '../../components/ConnectedWorkbenchesLink';

const title = 'Feature services';
const description = getFeatureStoreObjectDescription(FeatureStoreObject.FEATURE_SERVICES);

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
      <FeatureServicesListView featureServices={featureServices} fsProject={currentProject} />
    </ApplicationsPage>
  );
};

export default FeatureServices;
