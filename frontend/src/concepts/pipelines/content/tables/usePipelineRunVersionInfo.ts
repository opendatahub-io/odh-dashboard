import * as React from 'react';
import {
  PipelineRecurringRunKFv2,
  PipelineRunKFv2,
  PipelineVersionKFv2,
} from '~/concepts/pipelines/kfTypes';
import { PipelineRunVersionsContext } from '~/pages/pipelines/global/runs/PipelineRunVersionsContext';

const usePipelineRunVersionInfo = (
  run: PipelineRunKFv2 | PipelineRecurringRunKFv2 | null,
): {
  version: PipelineVersionKFv2 | undefined;
  loaded: boolean;
  error: Error | undefined;
} => {
  const { versions, loaded, error } = React.useContext(PipelineRunVersionsContext);
  const version = versions.find(
    (v) => v.pipeline_version_id === run?.pipeline_version_reference?.pipeline_version_id,
  );

  return { version, loaded, error };
};

export default usePipelineRunVersionInfo;
