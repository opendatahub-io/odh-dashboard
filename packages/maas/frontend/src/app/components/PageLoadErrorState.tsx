import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { EmptyState, EmptyStateBody, EmptyStateVariant, PageSection } from '@patternfly/react-core';
import React from 'react';

type PageLoadErrorStateProps = {
  error: Error;
  title?: string;
};

const PageLoadErrorState: React.FC<PageLoadErrorStateProps> = ({
  error,
  title = 'Error loading components',
}) => (
  <PageSection hasBodyWrapper={false} isFilled>
    <EmptyState
      headingLevel="h1"
      icon={ExclamationCircleIcon}
      titleText={title}
      variant={EmptyStateVariant.lg}
      data-testid="error-empty-state"
    >
      <EmptyStateBody data-testid="error-empty-state-body">{error.message}</EmptyStateBody>
    </EmptyState>
  </PageSection>
);

export default PageLoadErrorState;
