import React from 'react';
import { NoRunContent } from '#~/concepts/pipelines/content/tables/renderUtils';
import { MlflowNestedRun } from './types';

type PipelineRunTableRowNestedMlflowRunsProps = {
  nestedRuns?: MlflowNestedRun[];
};

const PipelineRunTableRowNestedMlflowRuns: React.FC<PipelineRunTableRowNestedMlflowRunsProps> = ({
  nestedRuns,
}) => {
  if (!nestedRuns?.length) {
    return <NoRunContent />;
  }

  return <>{nestedRuns.map((n) => n.mlflowRunId).join(', ')}</>;
};

export default PipelineRunTableRowNestedMlflowRuns;
