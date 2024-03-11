import * as React from 'react';
import { UseCheckboxTableBaseProps, useCheckboxTableBase } from '~/components/table';
import { PipelineAndVersionContext } from '~/concepts/pipelines/content/PipelineAndVersionContext';
import { PipelineKFv2 } from '~/concepts/pipelines/kfTypes';

const usePipelinesCheckboxTable = (
  pipelines: PipelineKFv2[],
): UseCheckboxTableBaseProps<PipelineKFv2> => {
  const { pipelineDataSelector } = React.useContext(PipelineAndVersionContext);
  const { selectedPipelines, setSelectedPipelines } = pipelineDataSelector();
  return useCheckboxTableBase<PipelineKFv2>(
    pipelines,
    selectedPipelines,
    setSelectedPipelines,
    React.useCallback((pipeline) => pipeline.pipeline_id, []),
  );
};

export default usePipelinesCheckboxTable;
