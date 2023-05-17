import * as React from 'react';
import { EmptyState, EmptyStateBody, EmptyStateIcon, Title } from '@patternfly/react-core';
import ExclamationCircleIcon from '@patternfly/react-icons/dist/esm/icons/exclamation-circle-icon';

const PipelineTopologyEmpty: React.FC = () => (
  <EmptyState>
    <EmptyStateIcon icon={ExclamationCircleIcon} />
    <Title headingLevel="h2" size="lg">
      No tasks to render
    </Title>
    <EmptyStateBody>This graph is not in a format we can render.</EmptyStateBody>
  </EmptyState>
);

export default PipelineTopologyEmpty;
