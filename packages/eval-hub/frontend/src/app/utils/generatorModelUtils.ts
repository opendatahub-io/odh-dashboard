import type { InferenceServiceItem } from '~/app/types';
import { getUrlValidationError } from '~/app/utils/validationUtils';

/** Returns a ready project's raw HTTP(S) endpoint URL for recommendation generation. */
export const getGeneratorModelEndpoint = (
  inferenceService: InferenceServiceItem,
): string | undefined => {
  const url = inferenceService.url?.trim();
  return inferenceService.ready && url && !getUrlValidationError(url) ? url : undefined;
};
