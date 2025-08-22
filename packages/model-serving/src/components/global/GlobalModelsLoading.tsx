import {
  Button,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateFooter,
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
  <PageSection hasBodyWrapper={false} isFilled>
    <EmptyState
      headingLevel="h1"
      titleText={title}
      variant={EmptyStateVariant.lg}
      data-testid="loading-empty-state"
    >
      <Spinner size="xl" />
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
