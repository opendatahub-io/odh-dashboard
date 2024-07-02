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

const PipelineVersionError: React.FC = () => (
  <PageSection className="pf-v5-u-h-100">
    <EmptyState variant={EmptyStateVariant.lg} isFullHeight>
      <EmptyStateHeader
        data-testid="error-state-title"
        titleText="Error loading pipeline run graph"
        icon={
          <EmptyStateIcon
            color="var(--pf-v5-global--warning-color--100)"
            icon={ExclamationTriangleIcon}
          />
        }
        headingLevel="h2"
      />
      <EmptyStateBody>
        Unable to load this run graph because the pipeline version that it belongs to has been
        deleted.
      </EmptyStateBody>
    </EmptyState>
  </PageSection>
);

export default PipelineVersionError;
