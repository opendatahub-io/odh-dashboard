import useGenericObjectState from '~/utilities/useGenericObjectState';

export type CreateExperimentData = {
  name: string;
  description: string;
};

const useCreateExperimentData = () =>
  useGenericObjectState<CreateExperimentData>({
    name: '',
    description: '',
  });

export default useCreateExperimentData;
