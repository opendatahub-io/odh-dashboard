import { ServingRuntimeKind } from '~/k8sTypes';
import useAcceleratorState, { AcceleratorState } from '~/utilities/useAcceleratorState';
import { GenericObjectState } from '~/utilities/useGenericObjectState';

const useServingAccelerator = (
  servingRuntime?: ServingRuntimeKind | null,
): GenericObjectState<AcceleratorState> => {
  const acceleratorName = servingRuntime?.metadata.annotations?.['opendatahub.io/accelerator-name'];
  const resources = servingRuntime?.spec.containers[0].resources;
  const tolerations = servingRuntime?.spec.tolerations;

  return useAcceleratorState(resources, tolerations, acceleratorName);
};

export default useServingAccelerator;
