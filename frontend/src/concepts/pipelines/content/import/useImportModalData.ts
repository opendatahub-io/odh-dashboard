import React from 'react';
import {
  PipelineUploadOption,
  generatePipelineVersionName,
} from '~/concepts/pipelines/content/import/utils';
import { PipelineKFv2 } from '~/concepts/pipelines/kfTypes';
import useGenericObjectState, { GenericObjectState } from '~/utilities/useGenericObjectState';

type PipelineModalData = {
  name: string;
  description: string;
  uploadOption: PipelineUploadOption;
  fileContents: string;
  pipelineUrl: string;
};

export const usePipelineImportModalData = (): GenericObjectState<PipelineModalData> =>
  useGenericObjectState<PipelineModalData>({
    name: '',
    description: '',
    uploadOption: PipelineUploadOption.FILE_UPLOAD,
    fileContents: '',
    pipelineUrl: '',
  });

type PipelineVersionModalData = {
  name: string;
  description: string;
  pipeline: PipelineKFv2 | null;
  uploadOption: PipelineUploadOption;
  fileContents: string;
  pipelineUrl: string;
};

export const usePipelineVersionImportModalData = (
  existingPipeline?: PipelineKFv2 | null,
): GenericObjectState<PipelineVersionModalData> => {
  const createDataState = useGenericObjectState<PipelineVersionModalData>({
    name: React.useMemo(() => generatePipelineVersionName(existingPipeline), [existingPipeline]),
    description: '',
    pipeline: existingPipeline ?? null,
    uploadOption: PipelineUploadOption.FILE_UPLOAD,
    fileContents: '',
    pipelineUrl: '',
  });

  return createDataState;
};
