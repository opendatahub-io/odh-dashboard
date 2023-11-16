import * as React from 'react';
import {
  EmptyState,
  EmptyStateIcon,
  EmptyStateBody,
  EmptyStateHeader,
  EmptyStateFooter,
} from '@patternfly/react-core';
import WrenchIcon from '@patternfly/react-icons/dist/esm/icons/wrench-icon';
import { CreatePipelineServerButton } from '~/concepts/pipelines/context';

type NoPipelineServerProps = {
  variant: React.ComponentProps<typeof CreatePipelineServerButton>['variant'];
};

const NoPipelineServer: React.FC<NoPipelineServerProps> = ({ variant }) => (
  <EmptyState variant="sm">
    <EmptyStateHeader
      titleText="No pipeline server"
      icon={<EmptyStateIcon icon={WrenchIcon} />}
      headingLevel="h3"
    />
    <EmptyStateBody>To import a pipeline, first create a pipeline server.</EmptyStateBody>
    <EmptyStateFooter>
      <CreatePipelineServerButton variant={variant} />
    </EmptyStateFooter>
  </EmptyState>
);

export default NoPipelineServer;
