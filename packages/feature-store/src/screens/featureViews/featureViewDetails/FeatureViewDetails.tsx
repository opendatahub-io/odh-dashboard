import {
  Breadcrumb,
  BreadcrumbItem,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Flex,
  FlexItem,
  EmptyStateFooter,
  EmptyStateActions,
} from '@patternfly/react-core';
import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { t_global_spacer_xs as ExtraSmallSpacerSize } from '@patternfly/react-tokens';
import { PathMissingIcon, SearchIcon } from '@patternfly/react-icons';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import FeatureViewTabs from './FeatureViewTabs';
import { getFeatureViewType } from '../utils';
import { useFeatureStoreProject } from '../../../FeatureStoreContext';
import useFeatureViewsByName from '../../../apiHooks/useFeatureViewsByName';
import FeatureStoreLabels from '../../../components/FeatureStoreLabels';
import { featureStoreRootRoute } from '../../../routes';
import FeatureStorePageTitle from '../../../components/FeatureStorePageTitle';
import FeatureStoreBreadcrumb from '../../components/FeatureStoreBreadcrumb';
import FeatureStoreAccessDenied from '../../../components/FeatureStoreAccessDenied';
import { isNotFoundError } from '../../../utils';
import { getFeatureStoreErrorMessage } from '../../../api/errorUtils';

const FeatureViewDetails = (): React.ReactElement => {
  const { currentProject } = useFeatureStoreProject();
  const { featureViewName } = useParams();
  const {
    data: featureView,
    error: featureViewError,
    loaded: featureViewLoaded,
  } = useFeatureViewsByName(currentProject, featureViewName);

  const emptyState = (
    <EmptyState
      headingLevel="h6"
      icon={SearchIcon}
      titleText="No feature views"
      variant={EmptyStateVariant.lg}
      data-testid="empty-state-title"
    >
      <EmptyStateBody data-testid="empty-state-body">
        No feature views have been found in this project.
      </EmptyStateBody>
    </EmptyState>
  );

  const errorState = (
    <EmptyState
      headingLevel="h6"
      icon={PathMissingIcon}
      titleText="Feature view not found"
      variant={EmptyStateVariant.lg}
      data-testid="error-state-title"
    >
      <EmptyStateBody data-testid="error-state-body">
        {getFeatureStoreErrorMessage(
          featureViewError,
          'The requested feature view could not be found.',
        )}
      </EmptyStateBody>
      <EmptyStateFooter>
        <EmptyStateActions>
          <Link to={`${featureStoreRootRoute()}/feature-views`}>Go to Feature Views</Link>
        </EmptyStateActions>
      </EmptyStateFooter>
    </EmptyState>
  );

  const loadErrorState = isNotFoundError(featureViewError) ? (
    errorState
  ) : (
    <FeatureStoreAccessDenied resourceType="feature view" projectName={currentProject} />
  );

  return (
    <ApplicationsPage
      empty={!featureViewLoaded}
      emptyStatePage={emptyState}
      title={
        featureViewLoaded && (
          <Flex alignItems={{ default: 'alignItemsCenter' }}>
            <FlexItem>{featureView.spec.name}</FlexItem>
            <FlexItem>
              <FeatureStoreLabels color="blue">
                {getFeatureViewType(featureView.type)}
              </FeatureStoreLabels>
            </FlexItem>
          </Flex>
        )
      }
      data-testid="feature-view-details-page"
      description={featureView.spec.description}
      loadError={featureViewError}
      loadErrorPage={featureViewError ? loadErrorState : undefined}
      loaded={featureViewLoaded}
      provideChildrenPadding
      breadcrumb={
        <FeatureStorePageTitle
          isDetailsPage
          breadcrumb={
            <Breadcrumb>
              <FeatureStoreBreadcrumb
                pageName="Feature views"
                projectName={currentProject || ''}
                linkTo={`${featureStoreRootRoute()}/feature-views`}
                dataTestId="feature-view-details-breadcrumb-link"
              />
              <BreadcrumbItem
                data-testid="breadcrumb-version-name"
                isActive
                style={{
                  textDecoration: 'underline',
                  textUnderlineOffset: ExtraSmallSpacerSize.var,
                }}
              >
                {featureViewName}
              </BreadcrumbItem>
            </Breadcrumb>
          }
        />
      }
    >
      <FeatureViewTabs featureView={featureView} />
    </ApplicationsPage>
  );
};

export default FeatureViewDetails;
