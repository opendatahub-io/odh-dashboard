import * as React from 'react';
import {
  Spinner,
  EmptyStateVariant,
  EmptyState,
  Title,
  EmptyStateBody,
} from '@patternfly/react-core';
import { PipelineSpecKF } from '~/concepts/pipelines/kfTypes';
import {
  DetailItem,
  renderDetailItems,
} from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/utils';
type PipelineRunTabParametersProps = {
  pipelineSpec?: PipelineSpecKF;
};

const PipelineRunTabParameters: React.FC<PipelineRunTabParametersProps> = ({ pipelineSpec }) => {
  if (!pipelineSpec) {
    return (
      <EmptyState variant={EmptyStateVariant.large} data-id="loading-empty-state">
        <Spinner size="xl" />
        <Title headingLevel="h4" size="lg">
          Loading
        </Title>
      </EmptyState>
    );
  }

  if (!pipelineSpec.parameters || pipelineSpec.parameters.length === 0) {
    return (
      <EmptyState variant={EmptyStateVariant.large} data-id="parameters-empty-state">
        <Title headingLevel="h4" size="lg">
          No parameters
        </Title>
        <EmptyStateBody>This pipeline run does not have any parameters defined.</EmptyStateBody>
      </EmptyState>
    );
  }

  const details: DetailItem[] = pipelineSpec.parameters.map((param) => ({
    key: param.name,
    value: param.value,
  }));

  return <>{renderDetailItems(details)}</>;
};

export default PipelineRunTabParameters;
