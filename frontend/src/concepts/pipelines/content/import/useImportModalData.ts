import { generatePipelineVersionName } from '~/concepts/pipelines/content/import/utils';
import { PipelineKF } from '~/concepts/pipelines/kfTypes';
import useGenericObjectState from '~/utilities/useGenericObjectState';

type PipelineModalData = {
  name: string;
  description: string;
  fileContents: string;
};

export const usePipelineImportModalData = () =>
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

export const usePipelineVersionImportModalData = (pipeline?: PipelineKF | null) => {
  const createDataState = useGenericObjectState<PipelineVersionModalData>({
    name: generatePipelineVersionName(pipeline),
    description: '',
    pipelineId: pipeline?.id ?? '',
    pipelineName: pipeline?.name ?? '',
    fileContents: '',
  });

  return createDataState;
};
