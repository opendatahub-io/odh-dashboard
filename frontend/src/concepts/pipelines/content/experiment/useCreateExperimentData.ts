import useGenericObjectState, {
  GenericObjectState,
} from '@odh-dashboard/ui-core/utilities/useGenericObjectState';

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
