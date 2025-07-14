import useGenericObjectState, { GenericObjectState } from '#~/utilities/useGenericObjectState';

export type CreateExperimentData = {
  name: string;
  description: string;
};

const useCreateExperimentData = (): GenericObjectState<CreateExperimentData> =>
  useGenericObjectState<CreateExperimentData>({
    name: '',
    description: '',
  });

export default useCreateExperimentData;
