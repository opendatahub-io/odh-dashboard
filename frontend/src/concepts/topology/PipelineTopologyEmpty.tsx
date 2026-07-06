import * as React from 'react';
import { EmptyState, EmptyStateBody } from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon';

const PipelineTopologyEmpty: React.FC = () => (
  <EmptyState
    headingLevel="h2"
    icon={ExclamationCircleIcon}
    titleText="No tasks to render"
    data-testid="topology"
  >
    <EmptyStateBody>This graph is not in a format we can render.</EmptyStateBody>
  </EmptyState>
);

export default PipelineTopologyEmpty;
