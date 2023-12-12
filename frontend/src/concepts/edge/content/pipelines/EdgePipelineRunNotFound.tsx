import * as React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateVariant,
  EmptyStateHeader,
} from '@patternfly/react-core';
import ExclamationCircleIcon from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon';

type EdgePipelineRunNotFound = {
  errorMessage: string;
};

const EdgePipelineRunNotFound: React.FC<EdgePipelineRunNotFound> = ({ errorMessage }) => (
  <EmptyState variant={EmptyStateVariant.lg} data-id="error-empty-state">
    <EmptyStateHeader
      titleText="Error loading pipeline run details"
      icon={<EmptyStateIcon icon={ExclamationCircleIcon} />}
      headingLevel="h4"
    />
    <EmptyStateBody>{errorMessage}</EmptyStateBody>
  </EmptyState>
);

export default EdgePipelineRunNotFound;
