import type { InferenceServiceItem } from '~/app/types';
import { getGenerationModelUrlValidationError } from '~/app/utils/validationUtils';
import { getIncompatibleModelReason } from '~/app/utils/modelCompatibility';

/** Returns a ready project's raw HTTP(S) endpoint URL for recommendation generation. */
export const getGeneratorModelEndpoint = (
  inferenceService: InferenceServiceItem,
): string | undefined => {
  const url = inferenceService.url?.trim();
  return !getIncompatibleModelReason(inferenceService) &&
    url &&
    !getGenerationModelUrlValidationError(url)
    ? url
    : undefined;
};
