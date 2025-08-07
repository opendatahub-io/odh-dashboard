/* eslint-disable camelcase */
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
import useFeatureServices from '#~/pages/featureStore/apiHooks/useFeatureServices';
import { FeatureView } from '#~/pages/featureStore/types/featureView';
import FeatureServicesListView from '#~/pages/featureStore/screens/featureServices/FeatureServicesListView';

type FeatureViewConsumingTabProps = {
  featureView: FeatureView;
};

const FeatureViewConsumingTab: React.FC<FeatureViewConsumingTabProps> = ({ featureView }) => {
  const { currentProject } = useFeatureStoreProject();

  const {
    data: consumingFeatureServices,
    loaded: consumingFeatureServicesLoaded,
    error: consumingFeatureServicesLoadError,
  } = useFeatureServices(currentProject, featureView.spec.name);
  if (!consumingFeatureServicesLoaded) {
    return (
      <Bullseye>
        <Spinner size="xl" data-testid="loading-spinner" />
      </Bullseye>
    );
  }

  if (consumingFeatureServicesLoadError) {
    return (
      <EmptyState
        headingLevel="h6"
        icon={SearchIcon}
        titleText="Error loading consuming feature services"
        variant={EmptyStateVariant.lg}
        data-testid="error-state-title"
      >
        <EmptyStateBody data-testid="error-state-body">
          Failed to load feature services that consume this feature view.
        </EmptyStateBody>
      </EmptyState>
    );
  }

  if (consumingFeatureServices.featureServices.length === 0) {
    return (
      <EmptyState
        headingLevel="h6"
        icon={SearchIcon}
        titleText="No consuming feature services found"
        variant={EmptyStateVariant.lg}
        data-testid="empty-state-title"
      >
        <EmptyStateBody data-testid="empty-state-body">
          No feature services are consuming this feature view.
        </EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <FeatureServicesListView
      featureServices={consumingFeatureServices}
      fsProject={currentProject}
    />
  );
};

export default FeatureViewConsumingTab;
