import * as React from 'react';
import { getPipelineVersionResourceRef } from '~/concepts/pipelines/content/tables/utils';
import { PipelineRunJobKF, PipelineRunKF, PipelineVersionKF } from '~/concepts/pipelines/kfTypes';
import { PipelineRunVersionsContext } from '~/pages/pipelines/global/runs/PipelineRunVersionsContext';

const usePipelineRunVersionInfo = (
  resource: PipelineRunKF | PipelineRunJobKF | null,
): {
  version?: PipelineVersionKF;
  isVersionLoaded: boolean;
  error?: Error;
} => {
  const { versions, loaded: isVersionLoaded, error } = React.useContext(PipelineRunVersionsContext);
  const versionRef = getPipelineVersionResourceRef(resource);
  const versionId = versionRef?.key.id;
  const version = versions.find((v) => v.id === versionId);

  return { version, isVersionLoaded, error };
};

export default usePipelineRunVersionInfo;
