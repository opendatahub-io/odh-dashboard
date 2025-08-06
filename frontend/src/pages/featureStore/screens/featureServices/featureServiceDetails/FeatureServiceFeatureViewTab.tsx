import React from 'react';
import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Spinner,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import { useFeatureStoreProject } from '#~/pages/featureStore/FeatureStoreContext';
import useFeatureViews from '#~/pages/featureStore/apiHooks/useFeatureViews';
import FeatureViewsListView from '#~/pages/featureStore/screens/featureViews/FeatureViewsListView';

type FeatureServiceFeatureViewTabProps = {
  featureServiceName: string;
};

const FeatureServiceFeatureViewTab: React.FC<FeatureServiceFeatureViewTabProps> = ({
  featureServiceName,
}) => {
  const { currentProject } = useFeatureStoreProject();

  const {
    data: featureViews,
    loaded: featureViewsLoaded,
    error: featureViewsLoadError,
  } = useFeatureViews(currentProject, featureServiceName);

  if (!featureViewsLoaded) {
    return (
      <Bullseye>
        <Spinner size="xl" data-testid="loading-spinner" />
      </Bullseye>
    );
  }

  if (featureViewsLoadError) {
    return (
      <EmptyState
        headingLevel="h6"
        icon={SearchIcon}
        titleText="Error loading feature views"
        variant={EmptyStateVariant.lg}
        data-testid="error-state-title"
      >
        <EmptyStateBody data-testid="error-state-body">
          Failed to load feature views for this entity.
        </EmptyStateBody>
      </EmptyState>
    );
  }

  if (featureViews.featureViews.length === 0) {
    return (
      <EmptyState
        headingLevel="h6"
        icon={SearchIcon}
        titleText="No feature views found"
        variant={EmptyStateVariant.lg}
        data-testid="empty-state-title"
      >
        <EmptyStateBody data-testid="empty-state-body">
          No feature views are associated with this entity.
        </EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <FeatureViewsListView featureViews={featureViews.featureViews} fsProject={currentProject} />
  );
};

export default FeatureServiceFeatureViewTab;
