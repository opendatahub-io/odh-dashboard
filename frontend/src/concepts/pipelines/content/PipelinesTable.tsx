import * as React from 'react';
import { EmptyState, Title } from '@patternfly/react-core';
import { PipelineKF } from '~/concepts/pipelines/kfTypes';

type PipelinesTableProps = {
  pipelines: PipelineKF[];
};

const PipelinesTable: React.FC<PipelinesTableProps> = ({ pipelines }) => (
  <EmptyState>
    <Title headingLevel="h2">Table coming soon; {pipelines.length} pipelines to show</Title>
  </EmptyState>
);

export default PipelinesTable;
