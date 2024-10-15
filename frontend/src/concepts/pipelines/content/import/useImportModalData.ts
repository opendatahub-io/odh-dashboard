import React from 'react';
import {
  PipelineUploadOption,
  generatePipelineVersionName,
} from '~/concepts/pipelines/content/import/utils';
import { PipelineKFv2 } from '~/concepts/pipelines/kfTypes';
import useGenericObjectState, { GenericObjectState } from '~/utilities/useGenericObjectState';

export type PipelineImportData = {
  name: string;
  description: string;
  uploadOption: PipelineUploadOption;
  fileContents: string;
  pipelineUrl: string;
  pipeline: PipelineKFv2 | null;
};

export const usePipelineImportModalData = (): GenericObjectState<PipelineImportData> =>
  useGenericObjectState<PipelineImportData>({
    name: '',
    description: '',
    uploadOption: PipelineUploadOption.FILE_UPLOAD,
    fileContents: '',
    pipelineUrl: '',
    pipeline: null,
  });

export const usePipelineVersionImportModalData = (
  existingPipeline?: PipelineKFv2 | null,
): GenericObjectState<PipelineImportData> => {
  const createDataState = useGenericObjectState<PipelineImportData>({
    name: React.useMemo(() => generatePipelineVersionName(existingPipeline), [existingPipeline]),
    description: '',
    pipeline: existingPipeline ?? null,
    uploadOption: PipelineUploadOption.FILE_UPLOAD,
    fileContents: '',
    pipelineUrl: '',
  });

  return createDataState;
};
