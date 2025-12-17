import { HardwareProfileKind } from '#~/k8sTypes';
import { CustomWatchK8sResult } from '#~/types';
import { groupVersionKind, HardwareProfileModel } from '#~/api';
import useK8sWatchResourceList from './useK8sWatchResourceList';

/**
 * Hook to watch hardware profiles in a specific namespace.
 *
 * @param namespace - The namespace to watch. If undefined, the watch is disabled (no API call).
 *                    To watch all namespaces, pass an empty string.
 * @returns [profiles, loaded, error]
 */
export const useWatchHardwareProfiles = (
  namespace?: string,
): CustomWatchK8sResult<HardwareProfileKind[]> =>
  useK8sWatchResourceList(
    // Only create watch resource if namespace is provided
    namespace
      ? {
          isList: true,
          groupVersionKind: groupVersionKind(HardwareProfileModel),
          namespace,
        }
      : null, // Passing null disables the watch
    HardwareProfileModel,
  );
