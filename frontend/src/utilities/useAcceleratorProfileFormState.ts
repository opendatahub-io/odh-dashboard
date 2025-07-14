import React from 'react';
import { AcceleratorProfileKind } from '#~/k8sTypes';
import { ContainerResources, Toleration } from '#~/types';
import { UpdateObjectAtPropAndValue } from '#~/pages/projects/types';
import useGenericObjectState from './useGenericObjectState';
import useReadAcceleratorState, { AcceleratorProfileState } from './useReadAcceleratorState';

export type AcceleratorProfileFormData = {
  profile?: AcceleratorProfileKind;
  count: number;
  useExistingSettings?: boolean;
};

export type UseAcceleratorProfileFormResult = {
  initialState: AcceleratorProfileState;
  formData: AcceleratorProfileFormData;
  setFormData: UpdateObjectAtPropAndValue<AcceleratorProfileFormData>;
  resetFormData: () => void;
  loaded: boolean;
  loadError: Error | undefined;
  refresh: () => Promise<AcceleratorProfileState | undefined>;
};

// TODO: Deprecate accelerator profile UI support in favor for hardware profiles. Remove in https://issues.redhat.com/browse/RHOAIENG-18070
const useAcceleratorProfileFormState = (
  resources?: ContainerResources,
  tolerations?: Toleration[],
  existingAcceleratorProfileName?: string,
  namespace?: string,
  acceleratorProfileNamespace?: string,
): UseAcceleratorProfileFormResult => {
  const [globalScopedInitialState, globalScopedLoaded, globalScopedLoadError, refresh] =
    useReadAcceleratorState(resources, tolerations, existingAcceleratorProfileName);
  const [projectScopedInitialState, projectScopedLoaded, projectScopedLoadError] =
    useReadAcceleratorState(
      resources,
      tolerations,
      existingAcceleratorProfileName,
      namespace,
      acceleratorProfileNamespace,
    );

  const loaded = namespace ? projectScopedLoaded && globalScopedLoaded : globalScopedLoaded;
  const loadError = namespace
    ? projectScopedLoadError || globalScopedLoadError
    : globalScopedLoadError;

  const initialState = React.useMemo(() => {
    // Check if project-scoped feature flag is off but workbench has project-scoped profile
    // Only apply this if acceleratorProfileNamespace is NOT the global dashboard namespace
    if (
      !namespace &&
      existingAcceleratorProfileName &&
      acceleratorProfileNamespace &&
      acceleratorProfileNamespace !==
        globalScopedInitialState.acceleratorProfiles[0]?.metadata.namespace
    ) {
      // Feature flag is off (no namespace) but workbench has project-scoped profile
      // Show "Existing settings" instead of searching for global profile with same name
      const state: AcceleratorProfileState = {
        acceleratorProfiles: globalScopedInitialState.acceleratorProfiles,
        acceleratorProfile: undefined,
        count: 1,
        unknownProfileDetected: true,
      };
      return state;
    }

    // If we have a namespace, use project-scoped state but include global profiles
    if (namespace) {
      // Keep project and global profiles separate
      const projectProfiles = [...projectScopedInitialState.acceleratorProfiles];
      const globalProfiles = [...globalScopedInitialState.acceleratorProfiles];
      const allProfiles = [...projectProfiles, ...globalProfiles];

      // Search for the existing accelerator profile by both name and namespace
      let acceleratorProfile: AcceleratorProfileKind | undefined;
      if (existingAcceleratorProfileName && acceleratorProfileNamespace) {
        // Look for the profile by both name and namespace in all available profiles
        acceleratorProfile = projectProfiles.find(
          (ap) =>
            ap.metadata.name === existingAcceleratorProfileName &&
            ap.metadata.namespace === acceleratorProfileNamespace,
        );
      } else if (existingAcceleratorProfileName) {
        // Fallback: look by name only if no namespace is specified
        acceleratorProfile = globalScopedInitialState.acceleratorProfile;
      }

      // Check for deleted profile: we have profile reference but can't find it
      const profileWasDeleted =
        existingAcceleratorProfileName &&
        !acceleratorProfile &&
        (projectScopedInitialState.unknownProfileDetected ||
          globalScopedInitialState.unknownProfileDetected);

      // Check if we have unknown profile detected from either scope or deleted profile
      const unknownProfileDetected = profileWasDeleted;

      // If we have unknown profile detected, we need to return a specific type
      if (unknownProfileDetected) {
        const state: AcceleratorProfileState = {
          acceleratorProfiles: allProfiles,
          acceleratorProfile: undefined,
          count: Math.max(projectScopedInitialState.count, globalScopedInitialState.count),
          unknownProfileDetected: true,
        };
        return state;
      }

      // If we have a profile, return it with both sets of profiles
      if (acceleratorProfile) {
        // Determine count from the appropriate scope
        const count =
          projectScopedInitialState.acceleratorProfile?.metadata.name ===
          acceleratorProfile.metadata.name
            ? projectScopedInitialState.count
            : globalScopedInitialState.count;

        const state: AcceleratorProfileState = {
          acceleratorProfiles: allProfiles,
          acceleratorProfile,
          count,
          unknownProfileDetected: false,
        };
        return state;
      }

      // If no profile is selected
      const state: AcceleratorProfileState = {
        acceleratorProfiles: allProfiles,
        acceleratorProfile: undefined,
        count: 0,
        unknownProfileDetected: false,
      };
      return state;
    }

    // If no namespace, just use global scoped state
    return globalScopedInitialState;
  }, [
    namespace,
    projectScopedInitialState,
    globalScopedInitialState,
    existingAcceleratorProfileName,
    acceleratorProfileNamespace,
  ]);

  const [formData, setFormData, resetFormData] = useGenericObjectState<AcceleratorProfileFormData>({
    profile: undefined,
    count: 0,
    useExistingSettings: false,
  });

  React.useEffect(() => {
    if (loaded) {
      setFormData('profile', initialState.acceleratorProfile);
      setFormData('count', initialState.count);
      setFormData('useExistingSettings', initialState.unknownProfileDetected);
    }
  }, [loaded, initialState, setFormData]);

  return {
    initialState,
    formData,
    setFormData,
    resetFormData,
    loaded,
    loadError,
    refresh,
  };
};

export default useAcceleratorProfileFormState;
