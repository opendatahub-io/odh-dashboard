import { SupportedArea, useIsAreaAvailable } from '#~/concepts/areas';
import { InferenceServiceKind, ServingRuntimeKind } from '#~/k8sTypes';
import useAcceleratorProfileFormState, {
  UseAcceleratorProfileFormResult,
} from '#~/utilities/useAcceleratorProfileFormState';

const useServingAcceleratorProfileFormState = (
  servingRuntime?: ServingRuntimeKind | null,
  inferenceService?: InferenceServiceKind | null,
): UseAcceleratorProfileFormResult => {
  const acceleratorProfileName =
    servingRuntime?.metadata.annotations?.['opendatahub.io/accelerator-name'];
  const resources =
    inferenceService?.spec.predictor.model?.resources ||
    servingRuntime?.spec.containers[0].resources;
  const tolerations =
    inferenceService?.spec.predictor.tolerations || servingRuntime?.spec.tolerations;
  const isProjectScopedAvailable = useIsAreaAvailable(SupportedArea.DS_PROJECT_SCOPED).status;
  const namespace = servingRuntime?.metadata.namespace;
  const acceleratorProfileNamespace =
    servingRuntime?.metadata.annotations?.['opendatahub.io/accelerator-profile-namespace'];

  return useAcceleratorProfileFormState(
    resources,
    tolerations,
    acceleratorProfileName,
    isProjectScopedAvailable ? namespace : undefined,
    acceleratorProfileNamespace,
  );
};

export default useServingAcceleratorProfileFormState;
