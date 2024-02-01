import React from 'react';
import { generatePipelineVersionName } from '~/concepts/pipelines/content/import/utils';
import { PipelineKFv2 } from '~/concepts/pipelines/kfTypes';
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
  pipeline: PipelineKFv2 | null;
  fileContents: string;
};

export const usePipelineVersionImportModalData = (
  existingPipeline?: PipelineKFv2 | null,
): GenericObjectState<PipelineVersionModalData> => {
  const createDataState = useGenericObjectState<PipelineVersionModalData>({
    name: React.useMemo(() => generatePipelineVersionName(existingPipeline), [existingPipeline]),
    description: '',
    pipeline: existingPipeline ?? null,
    fileContents: '',
  });

  return createDataState;
};
