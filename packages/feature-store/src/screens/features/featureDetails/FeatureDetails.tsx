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
import { t_global_spacer_xs as ExtraSmallSpacerSize } from '@patternfly/react-tokens';
import { PathMissingIcon, SearchIcon } from '@patternfly/react-icons';
import { Link, useParams } from 'react-router-dom';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import FeatureDetailsTabs from './FeatureDetailsTab';
import useFeatureByName from '../../../apiHooks/useFeatureByName';
import { useFeatureStoreProject } from '../../../FeatureStoreContext';
import { featureStoreRootRoute } from '../../../routes';

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
      titleText="No entities"
      variant={EmptyStateVariant.lg}
      data-testid="empty-state-title"
    >
      <EmptyStateBody data-testid="empty-state-body">
        No entities have been found in this project.
      </EmptyStateBody>
    </EmptyState>
  );
  if (featureLoadError) {
    return (
      <EmptyState
        headingLevel="h4"
        icon={PathMissingIcon}
        titleText="Error loading feature details"
        variant={EmptyStateVariant.lg}
        data-id="error-empty-state"
      >
        <EmptyStateBody>
          {featureLoadError.message || 'The requested feature could not be found.'}
        </EmptyStateBody>
        <EmptyStateFooter>
          <EmptyStateActions>
            <Link to={`${featureStoreRootRoute()}/features`}>Go to Features</Link>
          </EmptyStateActions>
        </EmptyStateFooter>
      </EmptyState>
    );
  }

  if (!featureLoaded) {
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
      loaded={featureLoaded}
      provideChildrenPadding
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem
            data-testid="feature-details-breadcrumb-link"
            render={() => <Link to={`${featureStoreRootRoute()}/features`}>Features</Link>}
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
    >
      <FeatureDetailsTabs feature={feature} />
    </ApplicationsPage>
  );
};

export default FeatureDetails;
