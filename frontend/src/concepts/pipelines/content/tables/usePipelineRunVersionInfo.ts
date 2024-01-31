import * as React from 'react';
import { getPipelineVersionResourceRef } from '~/concepts/pipelines/content/tables/utils';
import { PipelineRunJobKF, PipelineRunKF, PipelineVersionKFv2 } from '~/concepts/pipelines/kfTypes';
import { PipelineRunVersionsContext } from '~/pages/pipelines/global/runs/PipelineRunVersionsContext';

const usePipelineRunVersionInfo = (
  resource: PipelineRunKF | PipelineRunJobKF | null,
): {
  version: PipelineVersionKFv2 | undefined;
  isVersionLoaded: boolean;
  error: Error | undefined;
} => {
  const { versions, loaded: isVersionLoaded, error } = React.useContext(PipelineRunVersionsContext);
  const versionRef = getPipelineVersionResourceRef(resource);
  const versionId = versionRef?.key.id;
  const version = versions.find((v) => v.pipeline_version_id === versionId);

  return { version, isVersionLoaded, error };
};

export default usePipelineRunVersionInfo;
