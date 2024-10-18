import { InferenceServiceKind, ServingRuntimeKind } from '~/k8sTypes';
import useAcceleratorProfileForm, {
  UseAcceleratorProfileFormResult,
} from '~/utilities/useAcceleratorProfileForm';

const useServingAcceleratorProfileForm = (
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

  return useAcceleratorProfileForm(resources, tolerations, acceleratorProfileName);
};

export default useServingAcceleratorProfileForm;
