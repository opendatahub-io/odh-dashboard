import { ServingRuntimeKind } from '~/k8sTypes';
import useAcceleratorProfileState, {
  AcceleratorProfileState,
} from '~/utilities/useAcceleratorProfileState';
import { GenericObjectState } from '~/utilities/useGenericObjectState';

const useServingAcceleratorProfile = (
  servingRuntime?: ServingRuntimeKind | null,
): GenericObjectState<AcceleratorProfileState> => {
  const name = servingRuntime?.metadata.annotations?.['opendatahub.io/accelerator-name'];
  const resources = servingRuntime?.spec.containers[0].resources;
  const tolerations = servingRuntime?.spec.tolerations;

  return useAcceleratorProfileState(resources, tolerations, name);
};

export default useServingAcceleratorProfile;
