import React from 'react';
import {
  Bullseye,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Spinner,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import { useFeatureStoreProject } from '../../FeatureStoreContext';
import useFeatureViews from '../../apiHooks/useFeatureViews';
import FeatureViewsListView from '../featureViews/FeatureViewsListView';
import FeatureStoreAccessDenied from '../../components/FeatureStoreAccessDenied';

type FeatureViewTabProps = {
  fsObject: {
    entity?: string;
    feature?: string;
    featureService?: string;
  };
  contextName: string;
  isFromDetailsPage?: boolean;
};

const FeatureViewTab: React.FC<FeatureViewTabProps> = ({
  fsObject,
  contextName,
  isFromDetailsPage = true,
}) => {
  const { currentProject } = useFeatureStoreProject();

  const {
    data: featureViews,
    loaded: featureViewsLoaded,
    error: featureViewsLoadError,
  } = useFeatureViews({ project: currentProject, ...fsObject });

  if (featureViewsLoadError) {
    return (
      <EmptyState headingLevel="h6" variant={EmptyStateVariant.lg} data-testid="error-state-title">
        <EmptyStateBody data-testid="error-state-body">
          <FeatureStoreAccessDenied resourceType="feature views" projectName={currentProject} />
        </EmptyStateBody>
      </EmptyState>
    );
  }

  if (!featureViewsLoaded) {
    return (
      <Bullseye>
        <Spinner size="xl" data-testid="loading-spinner" />
      </Bullseye>
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
          No feature views are associated with this {contextName}.
        </EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <FeatureViewsListView
      featureViews={featureViews}
      fsProject={currentProject}
      isFromDetailsPage={isFromDetailsPage}
      fsObject={fsObject}
    />
  );
};

export default FeatureViewTab;
