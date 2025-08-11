import React from 'react';
import {
  EmptyStateActions,
  EmptyStateFooter,
  EmptyStateBody,
  EmptyStateVariant,
  EmptyState,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { ProjectObjectType } from '@odh-dashboard/internal/concepts/design/utils';
import TitleWithIcon from '@odh-dashboard/internal/concepts/design/TitleWithIcon';

type FeatureStoreProps = {
  title?: string;
  description?: string;
};

const defaultTitle = 'Feature store';
const defaultDescription =
  'Manage and serve machine learning features for training and inference. Create feature stores, define feature groups, and manage feature engineering pipelines for consistent data access across your ML workflows.';

const FeatureStore = ({
  title = defaultTitle,
  description = defaultDescription,
}: FeatureStoreProps): React.ReactElement => {
  // Placeholder data - in real implementation this would come from hooks
  const featureStores: unknown[] = [];
  const loaded = true;
  const loadError = undefined;

  const emptyState = (
    <EmptyState
      headingLevel="h6"
      icon={SearchIcon}
      titleText="No items found"
      variant={EmptyStateVariant.lg}
      data-testid="empty-state-title"
    >
      <EmptyStateBody data-testid="empty-state-body">
        No items have been created yet. Create new items to get started with feature store
        management.
      </EmptyStateBody>
      <EmptyStateFooter>
        <EmptyStateActions>
          {/* TODO: Add CreateFeatureStoreButton component */}
          {/* <CreateFeatureStoreButton /> */}
        </EmptyStateActions>
      </EmptyStateFooter>
    </EmptyState>
  );

  return (
    <ApplicationsPage
      empty={featureStores.length === 0}
      emptyStatePage={emptyState}
      title={<TitleWithIcon title={title} objectType={ProjectObjectType.featureStore} />}
      description={description}
      loadError={loadError}
      loaded={loaded}
      provideChildrenPadding
    >
      {/* TODO: Add specific feature store components based on the current section */}
      <div>Feature store content will go here</div>
    </ApplicationsPage>
  );
};

export default FeatureStore;
