import * as React from 'react';
import { PipelineRunKFv2, PipelineVersionKFv2 } from '~/concepts/pipelines/kfTypes';
import { PipelineRunVersionsContext } from '~/pages/pipelines/global/runs/PipelineRunVersionsContext';

const usePipelineRunVersionInfo = (
  run: PipelineRunKFv2 | null,
): {
  version: PipelineVersionKFv2 | undefined;
  loaded: boolean;
  error: Error | undefined;
} => {
  const { versions, loaded, error } = React.useContext(PipelineRunVersionsContext);
  const version = versions.find(
    (version) =>
      version.pipeline_version_id === run?.pipeline_version_reference.pipeline_version_id,
  );

  return { version, loaded, error };
};

export default usePipelineRunVersionInfo;
