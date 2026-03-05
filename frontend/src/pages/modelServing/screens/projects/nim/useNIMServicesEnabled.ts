/**
 * Hook to check if NIM Operator integration is enabled.
 *
 * When enabled (nimOperatorIntegration: true), the Dashboard creates
 * NIMService resources instead of InferenceService + ServingRuntime.
 * The NIM Operator then automatically creates the InferenceService.
 */
import { SupportedArea } from '#~/concepts/areas/types';
import useIsAreaAvailable from '#~/concepts/areas/useIsAreaAvailable';

export const useNIMServicesEnabled = (): {
  nimServicesEnabled: boolean;
  availabilityStatus: ReturnType<typeof useIsAreaAvailable>;
} => {
  const availabilityStatus = useIsAreaAvailable(SupportedArea.NIM_SERVICES);

  return {
    nimServicesEnabled: availabilityStatus.status,
    availabilityStatus,
  };
};

export default useNIMServicesEnabled;
