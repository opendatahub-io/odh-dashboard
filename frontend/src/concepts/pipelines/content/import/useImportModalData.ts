import useGenericObjectState from '~/utilities/useGenericObjectState';

type PipelineModalData = {
  name: string;
  description: string;
  fileContents: string;
};

const useImportModalData = () =>
  useGenericObjectState<PipelineModalData>({
    name: '',
    description: '',
    fileContents: '',
  });

export default useImportModalData;
