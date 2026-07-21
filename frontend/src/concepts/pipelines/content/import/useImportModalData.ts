import React from 'react';
import useGenericObjectState, {
  GenericObjectState,
} from '@odh-dashboard/ui-core/utilities/useGenericObjectState';
import {
  PipelineUploadOption,
  generatePipelineVersionName,
} from '#~/concepts/pipelines/content/import/utils';
import { PipelineKF } from '#~/concepts/pipelines/kfTypes';

export type PipelineImportData = {
  displayName: string;
  name: string;
  description: string;
  uploadOption: PipelineUploadOption;
  fileContents: string;
  pipelineUrl: string;
  pipeline: PipelineKF | null;
};

export const usePipelineImportModalData = (): GenericObjectState<PipelineImportData> =>
  useGenericObjectState<PipelineImportData>({
    displayName: '',
    name: '',
    description: '',
    uploadOption: PipelineUploadOption.FILE_UPLOAD,
    fileContents: '',
    pipelineUrl: '',
    pipeline: null,
  });

export const usePipelineVersionImportModalData = (
  existingPipeline?: PipelineKF | null,
): GenericObjectState<PipelineImportData> => {
  const createDataState = useGenericObjectState<PipelineImportData>({
    displayName: React.useMemo(
      () => generatePipelineVersionName(existingPipeline),
      [existingPipeline],
    ),
    name: React.useMemo(() => generatePipelineVersionName(existingPipeline), [existingPipeline]),
    description: '',
    pipeline: existingPipeline ?? null,
    uploadOption: PipelineUploadOption.FILE_UPLOAD,
    fileContents: '',
    pipelineUrl: '',
  });

  return createDataState;
};
