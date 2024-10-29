import React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import usePipelineById from '~/concepts/pipelines/apiHooks/usePipelineById';
import usePipelineVersionById from '~/concepts/pipelines/apiHooks/usePipelineVersionById';
import { PipelineKF, PipelineVersionKF } from '~/concepts/pipelines/kfTypes';
import { pipelinesBaseRoute } from '~/routes';

export const usePipelineVersionByParams = (): {
  pipeline: PipelineKF | null;
  version: PipelineVersionKF | null;
  isLoaded: boolean;
} => {
  const navigate = useNavigate();
  const { pipelineId, pipelineVersionId } = useParams();
  const [pipeline, isPipelineLoaded, pipelineError] = usePipelineById(pipelineId);
  const [version, isVersionLoaded, versionError] = usePipelineVersionById(
    pipelineId,
    pipelineVersionId,
  );

  // Redirect users to the Pipeline list page when failing to retrieve the version from route params.
  React.useEffect(() => {
    if (pipelineError || versionError) {
      navigate(pipelinesBaseRoute());
    }
  }, [versionError, navigate, pipelineError]);

  return { pipeline, version, isLoaded: isPipelineLoaded && isVersionLoaded };
};
