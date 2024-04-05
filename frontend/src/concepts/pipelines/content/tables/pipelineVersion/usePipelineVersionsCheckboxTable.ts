import * as React from 'react';
import { UseCheckboxTableBaseProps, useCheckboxTableBase } from '~/components/table';
import { PipelineAndVersionContext } from '~/concepts/pipelines/content/PipelineAndVersionContext';
import { PipelineKFv2, PipelineVersionKFv2 } from '~/concepts/pipelines/kfTypes';

const usePipelineVersionsCheckboxTable = (
  pipeline: PipelineKFv2,
  versions: PipelineVersionKFv2[],
): UseCheckboxTableBaseProps<PipelineVersionKFv2> => {
  const { isPipelineChecked, versionDataSelector } = React.useContext(PipelineAndVersionContext);
  const { selectedVersions, setSelectedVersions } = versionDataSelector(pipeline);
  const pipelineChecked = isPipelineChecked(pipeline.pipeline_id);
  return useCheckboxTableBase<PipelineVersionKFv2>(
    versions,
    selectedVersions,
    setSelectedVersions,
    React.useCallback((version) => version.pipeline_id, []),
    { selectAll: { disabled: pipelineChecked, ...(pipelineChecked ? { selected: true } : {}) } },
  );
};

export default usePipelineVersionsCheckboxTable;
