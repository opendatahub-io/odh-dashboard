import * as React from 'react';
import {
  Title,
  EmptyState,
  EmptyStateIcon,
  EmptyStateBody,
  Flex,
  FlexItem,
} from '@patternfly/react-core';
import WrenchIcon from '@patternfly/react-icons/dist/esm/icons/wrench-icon';
import { CreatePipelineServerButton } from '~/concepts/pipelines/context';

type NoPipelineServerProps = {
  variant: React.ComponentProps<typeof CreatePipelineServerButton>['variant'];
};

const NoPipelineServer: React.FC<NoPipelineServerProps> = ({ variant }) => (
  <EmptyState>
    <EmptyStateIcon icon={WrenchIcon} />
    <Title headingLevel="h2" size="lg">
      No pipeline server
    </Title>
    <EmptyStateBody>To import a pipeline, first create a pipeline server.</EmptyStateBody>
    <Flex direction={{ default: 'column' }}>
      <FlexItem spacer={{ default: 'spacerLg' }} />
      <FlexItem>
        <CreatePipelineServerButton variant={variant} />
      </FlexItem>
    </Flex>
  </EmptyState>
);

export default NoPipelineServer;
