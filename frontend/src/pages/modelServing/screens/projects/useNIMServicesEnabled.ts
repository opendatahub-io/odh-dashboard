/**
 * Hook to check if NIM Services (NIM Operator integration) is enabled.
 *
 * When enabled (disableNIMServices: false), the Dashboard should create
 * NIMService resources instead of InferenceService + ServingRuntime.
 *
 * The NIM Operator will then automatically create the InferenceService
 * from the NIMService resource.
 */
import { SupportedArea } from '#~/concepts/areas/types';
import useIsAreaAvailable from '#~/concepts/areas/useIsAreaAvailable';

/**
 * Returns true if NIM Services are enabled (NIM Operator integration is active).
 *
 * Note: The feature flag is `disableNIMServices`, so:
 * - disableNIMServices: true  → NIM Services DISABLED (use InferenceService directly)
 * - disableNIMServices: false → NIM Services ENABLED (use NIMService via NIM Operator)
 *
 * @returns Object with status boolean and detailed availability information
 */
export const useNIMServicesEnabled = (): {
  /** True if NIM Services are enabled and should be used */
  nimServicesEnabled: boolean;
  /** Detailed availability status */
  availabilityStatus: ReturnType<typeof useIsAreaAvailable>;
} => {
  const availabilityStatus = useIsAreaAvailable(SupportedArea.NIM_SERVICES);

  // The area is available when disableNIMServices is false
  // But we need to INVERT the logic because:
  // - disableNIMServices: false means the feature IS enabled
  // - useIsAreaAvailable returns true when the disable flag is false
  // So we need to check if the area is NOT available (meaning disableNIMServices is true)
  // and then invert it to get "is enabled"

  // Actually, useIsAreaAvailable already handles this correctly:
  // - When disableNIMServices: true → area is NOT available (status: false)
  // - When disableNIMServices: false → area IS available (status: true)
  // So status: true means NIM Services are enabled

  return {
    nimServicesEnabled: availabilityStatus.status,
    availabilityStatus,
  };
};

export default useNIMServicesEnabled;
