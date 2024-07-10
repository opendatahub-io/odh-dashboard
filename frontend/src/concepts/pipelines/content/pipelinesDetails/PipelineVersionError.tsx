import {
  EmptyState,
  EmptyStateBody,
  EmptyStateHeader,
  EmptyStateIcon,
  EmptyStateVariant,
  PageSection,
} from '@patternfly/react-core';
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
  <PageSection className="pf-v5-u-h-100">
    <EmptyState variant={EmptyStateVariant.lg} isFullHeight>
      <EmptyStateHeader
        data-testid={testId}
        titleText={title}
        icon={
          <EmptyStateIcon
            color="var(--pf-v5-global--warning-color--100)"
            icon={ExclamationTriangleIcon}
          />
        }
        headingLevel="h2"
      />
      <EmptyStateBody>{description}</EmptyStateBody>
    </EmptyState>
  </PageSection>
);

export default PipelineVersionError;
