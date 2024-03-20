import {
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
  EmptyStateHeader,
  EmptyStateVariant,
  PageSection,
  Spinner,
} from '@patternfly/react-core';
import React from 'react';

type ModelServingLoadingProps = {
  title: string;
  description: string;
  onCancel: () => void;
};

const ModelServingLoading: React.FC<ModelServingLoadingProps> = ({
  title,
  description,
  onCancel,
}) => (
  <PageSection isFilled>
    <EmptyState variant={EmptyStateVariant.lg} data-testid="loading-empty-state">
      <Spinner size="xl" />
      <EmptyStateHeader titleText={title} headingLevel="h1" />
      <EmptyStateBody>{description}</EmptyStateBody>
      <EmptyStateFooter>
        <EmptyStateActions>
          <Button data-testid="empty-state-cancel-button" variant="primary" onClick={onCancel}>
            Cancel
          </Button>
        </EmptyStateActions>
      </EmptyStateFooter>
    </EmptyState>
  </PageSection>
);

export default ModelServingLoading;
