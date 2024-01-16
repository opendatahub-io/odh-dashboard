import React from 'react';
import { generatePipelineVersionName } from '~/concepts/pipelines/content/import/utils';
import { PipelineKF } from '~/concepts/pipelines/kfTypes';
import useGenericObjectState, { GenericObjectState } from '~/utilities/useGenericObjectState';

type PipelineModalData = {
  name: string;
  description: string;
  fileContents: string;
};

export const usePipelineImportModalData = (): GenericObjectState<PipelineModalData> =>
  useGenericObjectState<PipelineModalData>({
    name: '',
    description: '',
    fileContents: '',
  });

type PipelineVersionModalData = {
  name: string;
  description: string;
  pipelineId: string;
  pipelineName: string;
  fileContents: string;
};

export const usePipelineVersionImportModalData = (
  pipeline?: PipelineKF | null,
): GenericObjectState<PipelineVersionModalData> => {
  const createDataState = useGenericObjectState<PipelineVersionModalData>({
    name: React.useMemo(() => generatePipelineVersionName(pipeline), [pipeline]),
    description: '',
    pipelineId: pipeline?.id ?? '',
    pipelineName: pipeline?.name ?? '',
    fileContents: '',
  });

  return createDataState;
};
