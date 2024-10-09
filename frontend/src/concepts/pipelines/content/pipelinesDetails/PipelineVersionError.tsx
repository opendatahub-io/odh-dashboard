import { EmptyState, EmptyStateBody, EmptyStateVariant, PageSection } from '@patternfly/react-core';
import { ExclamationTriangleIcon } from '@patternfly/react-icons';
import React from 'react';

type PipelineVersionErrorProps = {
  title?: string;
  description?: string;
  testId?: string;
};

const PipelineVersionError: React.FC<PipelineVersionErrorProps> = ({
  title,
  description,
  testId,
}) => (
  <PageSection hasBodyWrapper={false} className="pf-v6-u-h-100">
    <EmptyState
      data-testid={testId}
      headingLevel="h2"
      icon={ExclamationTriangleIcon}
      titleText={title}
      variant={EmptyStateVariant.lg}
      isFullHeight
    >
      <EmptyStateBody>{description}</EmptyStateBody>
    </EmptyState>
  </PageSection>
);

export default PipelineVersionError;
