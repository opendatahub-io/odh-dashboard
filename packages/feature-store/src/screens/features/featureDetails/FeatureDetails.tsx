import React from 'react';
import {
  EmptyStateBody,
  EmptyStateVariant,
  EmptyState,
  Breadcrumb,
  BreadcrumbItem,
  Bullseye,
  Spinner,
  EmptyStateFooter,
  EmptyStateActions,
} from '@patternfly/react-core';
import { PathMissingIcon, SearchIcon } from '@patternfly/react-icons';
import { t_global_spacer_xs as ExtraSmallSpacerSize } from '@patternfly/react-tokens';
import { Link, useParams } from 'react-router-dom';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import FeatureDetailsTabs from './FeatureDetailsTab';
import useFeatureByName from '../../../apiHooks/useFeatureByName';
import { useFeatureStoreProject } from '../../../FeatureStoreContext';
import { featureStoreRootRoute } from '../../../routes';
import FeatureStorePageTitle from '../../../components/FeatureStorePageTitle';
import FeatureStoreBreadcrumb from '../../components/FeatureStoreBreadcrumb';
import FeatureStoreAccessDenied from '../../../components/FeatureStoreAccessDenied';
import { isNotFoundError } from '../../../utils';
import { getFeatureStoreErrorMessage } from '../../../api/errorUtils';

const FeatureDetails = (): React.ReactElement => {
  const { currentProject } = useFeatureStoreProject();
  const { featureViewName, featureName } = useParams();
  const {
    data: feature,
    loaded: featureLoaded,
    error: featureLoadError,
  } = useFeatureByName(currentProject, featureViewName, featureName);

  const emptyState = (
    <EmptyState
      headingLevel="h6"
      icon={SearchIcon}
      titleText="No feature details"
      variant={EmptyStateVariant.lg}
      data-testid="empty-state-title"
    >
      <EmptyStateBody data-testid="empty-state-body">
        No feature details have been found in this project.
      </EmptyStateBody>
    </EmptyState>
  );

  const errorState = (
    <EmptyState
      headingLevel="h6"
      icon={PathMissingIcon}
      titleText="Feature not found"
      variant={EmptyStateVariant.lg}
      data-testid="error-state-title"
    >
      <EmptyStateBody data-testid="error-state-body">
        {getFeatureStoreErrorMessage(featureLoadError, 'The requested feature could not be found.')}
      </EmptyStateBody>
      <EmptyStateFooter>
        <EmptyStateActions>
          <Link to={`${featureStoreRootRoute()}/features`}>Go to Features</Link>
        </EmptyStateActions>
      </EmptyStateFooter>
    </EmptyState>
  );

  const loadErrorState = isNotFoundError(featureLoadError) ? (
    errorState
  ) : (
    <FeatureStoreAccessDenied resourceType="feature" projectName={currentProject} />
  );

  if (!featureLoaded && !featureLoadError) {
    return (
      <Bullseye>
        <Spinner />
      </Bullseye>
    );
  }

  return (
    <ApplicationsPage
      empty={!featureLoaded}
      emptyStatePage={emptyState}
      title={feature.name}
      description={feature.description}
      loadError={featureLoadError}
      loadErrorPage={featureLoadError ? loadErrorState : undefined}
      loaded={featureLoaded}
      provideChildrenPadding
      breadcrumb={
        <FeatureStorePageTitle
          isDetailsPage
          breadcrumb={
            <Breadcrumb>
              <FeatureStoreBreadcrumb
                pageName="Features"
                projectName={currentProject || ''}
                linkTo={`${featureStoreRootRoute()}/features`}
                dataTestId="feature-details-breadcrumb-link"
              />
              <BreadcrumbItem
                data-testid="feature-details-breadcrumb-item"
                isActive
                style={{
                  textDecoration: 'underline',
                  textUnderlineOffset: ExtraSmallSpacerSize.var,
                }}
              >
                {feature.name}
              </BreadcrumbItem>
            </Breadcrumb>
          }
        />
      }
    >
      <FeatureDetailsTabs feature={feature} />
    </ApplicationsPage>
  );
};

export default FeatureDetails;
