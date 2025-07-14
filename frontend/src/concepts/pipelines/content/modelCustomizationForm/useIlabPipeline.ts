import React from 'react';
import { ILAB_PIPELINE_NAME } from '#~/pages/pipelines/global/modelCustomization/const';
import { useLatestPipelineVersion } from '#~/concepts/pipelines/apiHooks/useLatestPipelineVersion';
import { usePipelineByName } from '#~/concepts/pipelines/apiHooks/usePipelineByName';
import { PipelineKF, PipelineVersionKF } from '#~/concepts/pipelines/kfTypes';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';

export const useIlabPipeline = (): {
  ilabPipeline: PipelineKF | null;
  ilabPipelineVersion: PipelineVersionKF | null;
  loaded: boolean;
  loadError: Error | undefined;
  refresh: () => Promise<PipelineVersionKF | null | undefined>;
} => {
  const { pipelinesServer, apiAvailable } = usePipelinesAPI();
  const [ilabPipeline, ilabPipelineLoaded, ilabPipelineLoadError, refreshIlabPipeline] =
    usePipelineByName(
      apiAvailable && pipelinesServer.compatible && pipelinesServer.installed
        ? ILAB_PIPELINE_NAME
        : '',
    );
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

  return { ilabPipeline, ilabPipelineVersion, loaded, loadError, refresh };
};
