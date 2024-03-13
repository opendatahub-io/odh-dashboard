import * as React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  EmptyStateIcon,
  EmptyStateHeader,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon';

const PipelineTopologyEmpty: React.FC = () => (
  <EmptyState data-testid="topology">
    <EmptyStateHeader
      titleText="No tasks to render"
      icon={<EmptyStateIcon icon={ExclamationCircleIcon} />}
      headingLevel="h2"
    />
    <EmptyStateBody>This graph is not in a format we can render.</EmptyStateBody>
  </EmptyState>
);

export default PipelineTopologyEmpty;
