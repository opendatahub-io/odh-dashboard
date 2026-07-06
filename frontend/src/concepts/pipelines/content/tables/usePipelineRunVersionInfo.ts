import * as React from 'react';
import {
  PipelineRecurringRunKF,
  PipelineRunKF,
  PipelineVersionKF,
} from '#~/concepts/pipelines/kfTypes';
import { PipelineRunVersionsContext } from '#~/pages/pipelines/global/runs/PipelineRunVersionsContext';

const usePipelineRunVersionInfo = (
  run: PipelineRunKF | PipelineRecurringRunKF | null,
): {
  version: PipelineVersionKF | undefined;
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
