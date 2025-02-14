import React from 'react';
import { ILAB_PIPELINE_NAME } from '~/pages/pipelines/global/modelCustomization/const';
import { FetchState } from '~/utilities/useFetchState';
import { useLatestPipelineVersion } from '~/concepts/pipelines/apiHooks/useLatestPipelineVersion';
import { usePipelineByName } from '~/concepts/pipelines/apiHooks/usePipelineByName';
import { PipelineVersionKF } from '~/concepts/pipelines/kfTypes';

export const useIlabPipeline = (): FetchState<PipelineVersionKF | null> => {
  const [ilabPipeline, ilabPipelineLoaded, ilabPipelineLoadError, refreshIlabPipeline] =
    usePipelineByName(ILAB_PIPELINE_NAME);
  const [
    ilabPipelineVersion,
    ilabPipelineVersionLoaded,
    ilabPipelineVersionLoadError,
    refreshIlabPipelineVersion,
  ] = useLatestPipelineVersion(ilabPipeline?.pipeline_id);
  const loaded = ilabPipelineLoaded && ilabPipelineVersionLoaded;
  const loadError = ilabPipelineLoadError || ilabPipelineVersionLoadError;
  const refresh = React.useCallback(async () => {
    await refreshIlabPipeline();
    return refreshIlabPipelineVersion();
  }, [refreshIlabPipeline, refreshIlabPipelineVersion]);

  return [ilabPipelineVersion, loaded, loadError, refresh];
};
