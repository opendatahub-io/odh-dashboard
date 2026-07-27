import React from 'react';
import { Flex } from '@patternfly/react-core';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
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
import { FeatureStoreEmptyState } from '../components/EmptyStateFeatureStore';

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
    <FeatureStoreEmptyState
      resourceTypeSingular="feature service"
      resourceTypePlural="feature services"
    />
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
