import React from 'react';
import {
  EmptyStateBody,
  EmptyStateVariant,
  EmptyState,
  Breadcrumb,
  BreadcrumbItem,
  Bullseye,
  Spinner,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { useParams } from 'react-router-dom';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import FeatureServiceDetailsTabs from './FeatureServiceDetailsTabs';
import { useFeatureStoreProject } from '../../../FeatureStoreContext';
import useFeatureServiceByName from '../../../apiHooks/useFeatureServiceByName';
import { featureStoreRootRoute } from '../../../routes';
import FeatureStorePageTitle from '../../../components/FeatureStorePageTitle';
import FeatureStoreBreadcrumb from '../../components/FeatureStoreBreadcrumb';

const FeatureServiceDetails = (): React.ReactElement => {
  const { currentProject } = useFeatureStoreProject();

  const { featureServiceName } = useParams();
  const {
    data: featureService,
    loaded: featureServiceLoaded,
    error: featureServiceLoadError,
  } = useFeatureServiceByName(currentProject, featureServiceName);

  if (featureServiceLoadError) {
    return (
      <EmptyState
        headingLevel="h4"
        icon={ExclamationCircleIcon}
        titleText="Error loading feature details"
        variant={EmptyStateVariant.lg}
        data-id="error-empty-state"
      >
        <EmptyStateBody>{featureServiceLoadError.message}</EmptyStateBody>
      </EmptyState>
    );
  }

  if (!featureServiceLoaded) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  return (
    <ApplicationsPage
      empty={false}
      title={featureService.spec.name}
      description={featureService.spec.description}
      loadError={featureServiceLoadError}
      loaded={featureServiceLoaded}
      provideChildrenPadding
      breadcrumb={
        <FeatureStorePageTitle
          isDetailsPage
          breadcrumb={
            <Breadcrumb>
              <FeatureStoreBreadcrumb
                pageName="Feature services"
                projectName={currentProject || ''}
                linkTo={`${featureStoreRootRoute()}/featureServices`}
                dataTestId="feature-service-details-breadcrumb-link"
              />
              <BreadcrumbItem data-testid="breadcrumb-feature-service-name" isActive>
                {featureService.spec.name}
              </BreadcrumbItem>
            </Breadcrumb>
          }
        />
      }
    >
      <FeatureServiceDetailsTabs featureService={featureService} fsProject={currentProject} />
    </ApplicationsPage>
  );
};

export default FeatureServiceDetails;
