import { AcceleratorProfileKind } from '~/k8sTypes';
import { ContainerResources, Toleration } from '~/types';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import useGenericObjectState from './useGenericObjectState';
import useReadAcceleratorState, { AcceleratorProfileState } from './useReadAcceleratorState';

export type AcceleratorProfileFormData = {
  profile?: AcceleratorProfileKind;
  count: number;
  useExistingSettings: boolean;
};

export type UseAcceleratorProfileFormResult = {
  initialState: AcceleratorProfileState;
  formData: AcceleratorProfileFormData;
  setFormData: UpdateObjectAtPropAndValue<AcceleratorProfileFormData>;
  resetFormData: () => void;
};

const useAcceleratorProfileFormState = (
  resources?: ContainerResources,
  tolerations?: Toleration[],
  existingAcceleratorProfileName?: string,
): UseAcceleratorProfileFormResult => {
  const initialState = useReadAcceleratorState(
    resources,
    tolerations,
    existingAcceleratorProfileName,
  );

  const [formData, setFormData, resetFormData] = useGenericObjectState<AcceleratorProfileFormData>({
    profile: initialState.acceleratorProfile,
    count: initialState.count,
    useExistingSettings: !!initialState.acceleratorProfile,
  });

  return {
    initialState,
    formData,
    setFormData,
    resetFormData,
  };
};

export default useAcceleratorProfileFormState;
