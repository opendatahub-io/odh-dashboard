import useGenericObjectState, { GenericObjectState } from '~/utilities/useGenericObjectState';

type PipelineModalData = {
  name: string;
  description: string;
  fileContents: string;
};

const useImportModalData = (): GenericObjectState<PipelineModalData> =>
  useGenericObjectState<PipelineModalData>({
    name: '',
    description: '',
    fileContents: '',
  });

export default useImportModalData;
