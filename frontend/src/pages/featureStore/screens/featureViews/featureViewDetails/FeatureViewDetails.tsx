import {
  Breadcrumb,
  BreadcrumbItem,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Flex,
  FlexItem,
  Skeleton,
} from '@patternfly/react-core';
import React from 'react';
import { Link, useParams } from 'react-router';
import { t_global_spacer_xs as ExtraSmallSpacerSize } from '@patternfly/react-tokens';
import { SearchIcon } from '@patternfly/react-icons';
import ApplicationsPage from '#~/pages/ApplicationsPage.tsx';
import { useFeatureStoreProject } from '#~/pages/featureStore/FeatureStoreContext.tsx';
import useFeatureViewsByName from '#~/pages/featureStore/apiHooks/useFeatureViewsByName.ts';
import FeatureStoreLabels from '#~/pages/featureStore/components/FeatureStoreLabels.tsx';
import { getFeatureViewType } from '#~/pages/featureStore/screens/featureViews/utils';
import FeatureViewTabs from './FeatureViewTabs';

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
        <Breadcrumb>
          <BreadcrumbItem
            render={() => <Link to="/featureStore/featureViews">Feature Views</Link>}
          />
          {featureView.spec.name ? (
            <BreadcrumbItem
              data-testid="breadcrumb-version-name"
              isActive
              style={{
                textDecoration: 'underline',
                textUnderlineOffset: ExtraSmallSpacerSize.var,
              }}
            >
              {featureView.spec.name}
            </BreadcrumbItem>
          ) : (
            <Skeleton height="20px" width="100px" />
          )}
        </Breadcrumb>
      }
    >
      <FeatureViewTabs featureView={featureView} />
    </ApplicationsPage>
  );
};

export default FeatureViewDetails;
