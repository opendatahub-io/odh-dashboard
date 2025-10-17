import React from 'react';
import {
  EmptyStateBody,
  EmptyStateVariant,
  EmptyState,
  Breadcrumb,
  BreadcrumbItem,
  EmptyStateFooter,
  EmptyStateActions,
} from '@patternfly/react-core';
import { t_global_spacer_xs as ExtraSmallSpacerSize } from '@patternfly/react-tokens';
import { PathMissingIcon, SearchIcon } from '@patternfly/react-icons';
import { Link, useParams } from 'react-router-dom';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import FeatureServiceDetailsTabs from './FeatureServiceDetailsTabs';
import { useFeatureStoreProject } from '../../../FeatureStoreContext';
import useFeatureServiceByName from '../../../apiHooks/useFeatureServiceByName';
import { featureStoreRootRoute } from '../../../routes';
import FeatureStorePageTitle from '../../../components/FeatureStorePageTitle';
import FeatureStoreBreadcrumb from '../../components/FeatureStoreBreadcrumb';
import FeatureStoreAccessDenied from '../../../components/FeatureStoreAccessDenied';
import { isNotFoundError } from '../../../utils';
import { getFeatureStoreErrorMessage } from '../../../api/errorUtils';

const FeatureServiceDetails = (): React.ReactElement => {
  const { currentProject } = useFeatureStoreProject();

  const { featureServiceName } = useParams();
  const {
    data: featureService,
    loaded: featureServiceLoaded,
    error: featureServiceLoadError,
  } = useFeatureServiceByName(currentProject, featureServiceName);

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

  const errorState = (
    <EmptyState
      headingLevel="h6"
      icon={PathMissingIcon}
      titleText="Feature service not found"
      variant={EmptyStateVariant.lg}
      data-testid="error-state-title"
    >
      <EmptyStateBody data-testid="error-state-body">
        {getFeatureStoreErrorMessage(
          featureServiceLoadError,
          'The requested feature service could not be found.',
        )}
      </EmptyStateBody>
      <EmptyStateFooter>
        <EmptyStateActions>
          <Link to={`${featureStoreRootRoute()}/feature-services`}>Go to Feature Services</Link>
        </EmptyStateActions>
      </EmptyStateFooter>
    </EmptyState>
  );

  const loadErrorState = isNotFoundError(featureServiceLoadError) ? (
    errorState
  ) : (
    <FeatureStoreAccessDenied resourceType="feature service" projectName={currentProject} />
  );

  return (
    <ApplicationsPage
      empty={!featureServiceLoaded}
      emptyStatePage={emptyState}
      title={featureService.spec.name}
      data-testid="feature-service-details-page"
      description={featureService.spec.description}
      loadError={featureServiceLoadError}
      loadErrorPage={featureServiceLoadError ? loadErrorState : undefined}
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
                linkTo={`${featureStoreRootRoute()}/feature-services`}
                dataTestId="feature-service-details-breadcrumb-link"
              />
              <BreadcrumbItem
                data-testid="breadcrumb-feature-service-name"
                isActive
                style={{
                  textDecoration: 'underline',
                  textUnderlineOffset: ExtraSmallSpacerSize.var,
                }}
              >
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
