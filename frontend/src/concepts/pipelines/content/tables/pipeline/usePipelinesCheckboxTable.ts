import * as React from 'react';
import { UseCheckboxTableBaseProps, useCheckboxTableBase } from '#~/components/table';
import { PipelineAndVersionContext } from '#~/concepts/pipelines/content/PipelineAndVersionContext';
import { PipelineKF } from '#~/concepts/pipelines/kfTypes';

const usePipelinesCheckboxTable = (
  pipelines: PipelineKF[],
): UseCheckboxTableBaseProps<PipelineKF> => {
  const { pipelineDataSelector } = React.useContext(PipelineAndVersionContext);
  const { selectedPipelines, setSelectedPipelines } = pipelineDataSelector();
  return useCheckboxTableBase<PipelineKF>(
    pipelines,
    selectedPipelines,
    setSelectedPipelines,
    React.useCallback((pipeline) => pipeline.pipeline_id, []),
  );
};

export default usePipelinesCheckboxTable;
