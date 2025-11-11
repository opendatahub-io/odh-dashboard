import { ModelServingHardwareProfileState } from '#~/concepts/hardwareProfiles/useModelServingPodSpecOptionsState';
import { ModelServingPodSpecOptionsState } from '#~/concepts/hardwareProfiles/deprecated/useModelServingAcceleratorDeprecatedPodSpecOptionsState';
import { modelServingSizeSchema } from '#~/pages/modelServing/screens/projects/ServingRuntimeModal/validationUtils.ts';
import { useValidation } from '#~/utilities/useValidation.ts';

// todo: remove the deprecated ModelServingPodSpecOptionsState once modelmesh is removed
const useModelServerSizeValidation = (
  podSpecOptionsState: ModelServingPodSpecOptionsState | ModelServingHardwareProfileState,
): { isValid: boolean } => {
  const validation = useValidation(
    podSpecOptionsState.modelSize.selectedSize,
    modelServingSizeSchema,
  );
  const hasValidationErrors = Object.keys(validation.getAllValidationIssues()).length > 0;

  return {
    isValid: !hasValidationErrors,
  };
};

export default useModelServerSizeValidation;
