import {
  Breadcrumb,
  BreadcrumbItem,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import React from 'react';
import { useParams } from 'react-router-dom';
import { t_global_spacer_xs as ExtraSmallSpacerSize } from '@patternfly/react-tokens';
import { SearchIcon } from '@patternfly/react-icons';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import FeatureViewTabs from './FeatureViewTabs';
import { getFeatureViewType } from '../utils';
import { useFeatureStoreProject } from '../../../FeatureStoreContext';
import useFeatureViewsByName from '../../../apiHooks/useFeatureViewsByName';
import FeatureStoreLabels from '../../../components/FeatureStoreLabels';
import { featureStoreRootRoute } from '../../../routes';
import FeatureStorePageTitle from '../../../components/FeatureStorePageTitle';
import FeatureStoreBreadcrumb from '../../components/FeatureStoreBreadcrumb';

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
      titleText="No feature view"
      variant={EmptyStateVariant.lg}
      data-testid="empty-state-title"
    >
      <EmptyStateBody data-testid="empty-state-body">
        No feature view have been found in this project.
      </EmptyStateBody>
    </EmptyState>
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
      description={featureView.spec.description}
      loadError={featureViewError}
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
