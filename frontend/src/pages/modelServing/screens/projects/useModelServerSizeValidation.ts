import { ModelServingPodSpecOptionsState } from '#~/concepts/hardwareProfiles/useModelServingPodSpecOptionsState.ts';
import { modelServingSizeSchema } from '#~/pages/modelServing/screens/projects/ServingRuntimeModal/validationUtils.ts';
import { useValidation } from '#~/utilities/useValidation.ts';

const useModelServerSizeValidation = (
  podSpecOptionsState: ModelServingPodSpecOptionsState,
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
