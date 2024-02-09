import * as React from 'react';
import {
  Spinner,
  EmptyStateVariant,
  EmptyState,
  EmptyStateBody,
  EmptyStateHeader,
} from '@patternfly/react-core';
import { PipelineRunJobKFv2, PipelineRunKFv2 } from '~/concepts/pipelines/kfTypes';
import {
  DetailItem,
  renderDetailItems,
} from '~/concepts/pipelines/content/pipelinesDetails/pipelineRun/utils';

type PipelineRunTabParametersProps = {
  run?: PipelineRunJobKFv2 | PipelineRunKFv2;
};

const PipelineRunTabParameters: React.FC<PipelineRunTabParametersProps> = ({ run }) => {
  if (!run) {
    return (
      <EmptyState variant={EmptyStateVariant.lg} data-id="loading-empty-state">
        <Spinner size="xl" />
        <EmptyStateHeader titleText="Loading" headingLevel="h4" />
      </EmptyState>
    );
  }

  const parameters = run?.runtime_config?.parameters
    ? Object.entries(run?.runtime_config?.parameters)
    : [];

  if (parameters.length === 0) {
    return (
      <EmptyState variant={EmptyStateVariant.lg} data-id="parameters-empty-state">
        <EmptyStateHeader titleText="No parameters" headingLevel="h2" />
        <EmptyStateBody>This pipeline run does not have any parameters defined.</EmptyStateBody>
      </EmptyState>
    );
  }

  const details: DetailItem[] = parameters.map(([key, value]) => ({
    key,
    value: value?.toString() ?? '',
  }));

  return <>{renderDetailItems(details, true)}</>;
};

export default PipelineRunTabParameters;
