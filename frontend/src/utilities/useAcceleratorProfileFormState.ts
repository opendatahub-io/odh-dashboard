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
): UseAcceleratorProfileFormResult => {
  const [globalScopedInitialState, globalScopedLoaded, globalScopedLoadError, refresh] =
    useReadAcceleratorState(resources, tolerations, existingAcceleratorProfileName);
  const [projectScopedInitialState, projectScopedLoaded, projectScopedLoadError] =
    useReadAcceleratorState(resources, tolerations, existingAcceleratorProfileName, namespace);

  const loaded = namespace ? projectScopedLoaded && globalScopedLoaded : globalScopedLoaded;
  const loadError = namespace
    ? projectScopedLoadError || globalScopedLoadError
    : globalScopedLoadError;

  const initialState = React.useMemo(() => {
    // If we have a namespace, use project-scoped state but include global profiles
    if (namespace) {
      // Keep project and global profiles separate
      const projectProfiles = [...projectScopedInitialState.acceleratorProfiles];
      const globalProfiles = [...globalScopedInitialState.acceleratorProfiles];

      // Determine which accelerator profile to use
      const acceleratorProfile =
        projectScopedInitialState.acceleratorProfile || globalScopedInitialState.acceleratorProfile;

      // Check if we have unknown profile detected
      const unknownProfileDetected =
        projectScopedInitialState.unknownProfileDetected ||
        globalScopedInitialState.unknownProfileDetected;

      // If we have unknown profile detected, we need to return a specific type
      if (unknownProfileDetected) {
        const state: AcceleratorProfileState = {
          // Keep project and global profiles separate
          acceleratorProfiles: [...projectProfiles, ...globalProfiles],
          acceleratorProfile: undefined,
          count: 0,
          unknownProfileDetected: true,
        };
        return state;
      }

      // If we have a profile, return it with both sets of profiles
      if (acceleratorProfile) {
        const state: AcceleratorProfileState = {
          // Keep project and global profiles separate
          acceleratorProfiles: [...projectProfiles, ...globalProfiles],
          acceleratorProfile,
          count:
            acceleratorProfile === projectScopedInitialState.acceleratorProfile
              ? projectScopedInitialState.count
              : globalScopedInitialState.count,
          unknownProfileDetected: false,
        };
        return state;
      }

      // If no profile is selected
      const state: AcceleratorProfileState = {
        // Keep project and global profiles separate
        acceleratorProfiles: [...projectProfiles, ...globalProfiles],
        acceleratorProfile: undefined,
        count: 0,
        unknownProfileDetected: false,
      };
      return state;
    }

    // If no namespace, just use global scoped state
    return globalScopedInitialState;
  }, [namespace, projectScopedInitialState, globalScopedInitialState]);

  const [formData, setFormData, resetFormData] = useGenericObjectState<AcceleratorProfileFormData>({
    profile: undefined,
    count: 0,
    useExistingSettings: false,
  });

  React.useEffect(() => {
    if (loaded) {
      setFormData('profile', initialState.acceleratorProfile);
      setFormData('count', initialState.count);
      setFormData(
        'useExistingSettings',
        namespace
          ? projectScopedInitialState.unknownProfileDetected ||
              globalScopedInitialState.unknownProfileDetected
          : globalScopedInitialState.unknownProfileDetected,
      );
    }
  }, [
    loaded,
    initialState,
    setFormData,
    namespace,
    projectScopedInitialState,
    globalScopedInitialState,
  ]);

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
