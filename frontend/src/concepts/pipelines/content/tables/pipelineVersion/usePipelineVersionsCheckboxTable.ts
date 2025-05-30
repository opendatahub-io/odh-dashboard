import * as React from 'react';
import { UseCheckboxTableBaseProps, useCheckboxTableBase } from '#~/components/table';
import { PipelineAndVersionContext } from '#~/concepts/pipelines/content/PipelineAndVersionContext';
import { PipelineKF, PipelineVersionKF } from '#~/concepts/pipelines/kfTypes';

const usePipelineVersionsCheckboxTable = (
  pipeline: PipelineKF,
  versions: PipelineVersionKF[],
): UseCheckboxTableBaseProps<PipelineVersionKF> => {
  const { isPipelineChecked, versionDataSelector } = React.useContext(PipelineAndVersionContext);
  const { selectedVersions, setSelectedVersions } = versionDataSelector(pipeline);
  const pipelineChecked = isPipelineChecked(pipeline.pipeline_id);
  return useCheckboxTableBase<PipelineVersionKF>(
    versions,
    selectedVersions,
    setSelectedVersions,
    React.useCallback((version) => version.pipeline_version_id, []),
    { selectAll: { disabled: pipelineChecked, ...(pipelineChecked ? { selected: true } : {}) } },
  );
};

export default usePipelineVersionsCheckboxTable;
