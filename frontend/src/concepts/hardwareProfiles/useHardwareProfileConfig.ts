import React, { useRef } from 'react';
import { HardwareProfileFeatureVisibility, HardwareProfileKind } from '#~/k8sTypes';
import { UpdateObjectAtPropAndValue } from '#~/pages/projects/types';
import useGenericObjectState from '#~/utilities/useGenericObjectState';
import { ContainerResources, NodeSelector, Toleration } from '#~/types';
import { isCpuLimitLarger, isMemoryLimitLarger } from '#~/utilities/valueUnits';
import { isHardwareProfileEnabled } from '#~/pages/hardwareProfiles/utils';
import { useDashboardNamespace } from '#~/redux/selectors';
import {
  filterProfilesByKueue,
  useKueueConfiguration,
} from '#~/concepts/hardwareProfiles/kueueUtils';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import { useHardwareProfilesByFeatureVisibility } from '#~/pages/hardwareProfiles/useHardwareProfilesByFeatureVisibility';
import { isHardwareProfileConfigValid } from './validationUtils';
import { getContainerResourcesFromHardwareProfile } from './utils';

export type HardwareProfileConfig = {
  selectedProfile?: HardwareProfileKind;
  useExistingSettings: boolean;
  resources?: ContainerResources;
};

export type UseHardwareProfileConfigResult = {
  formData: HardwareProfileConfig;
  initialHardwareProfile?: HardwareProfileKind;
  isFormDataValid: boolean;
  setFormData: UpdateObjectAtPropAndValue<HardwareProfileConfig>;
  resetFormData: () => void;
  profilesLoaded: boolean;
  profilesLoadError?: Error;
};

const matchToHardwareProfile = (
  hardwareProfiles: HardwareProfileKind[],
  resources?: ContainerResources,
  tolerations: Toleration[] = [],
  nodeSelector: NodeSelector = {},
): HardwareProfileKind | undefined => {
  if (!resources) {
    return undefined;
  }

  const matchingProfiles = hardwareProfiles.filter((profile) => {
    const identifiersMatch = profile.spec.identifiers?.every((identifier) => {
      const requestValue = resources.requests?.[identifier.identifier];
      const limitValue = resources.limits?.[identifier.identifier];

      if (!requestValue || !limitValue) {
        return false;
      }

      if (identifier.identifier === 'cpu') {
        return (
          // max is larger or equal
          isCpuLimitLarger(requestValue, identifier.maxCount, true) &&
          isCpuLimitLarger(limitValue, identifier.maxCount, true) &&
          // min is smaller or equal
          isCpuLimitLarger(identifier.minCount, requestValue, true) &&
          isCpuLimitLarger(identifier.minCount, limitValue, true)
        );
      }

      if (identifier.identifier === 'memory') {
        return (
          // max is larger or equal
          (!identifier.maxCount ||
            (isMemoryLimitLarger(requestValue.toString(), identifier.maxCount.toString(), true) &&
              isMemoryLimitLarger(limitValue.toString(), identifier.maxCount.toString(), true))) &&
          // min is smaller or equal
          isMemoryLimitLarger(identifier.minCount.toString(), requestValue.toString(), true) &&
          isMemoryLimitLarger(identifier.minCount.toString(), limitValue.toString(), true)
        );
      }

      return (
        // min is smaller or equal
        Number(identifier.minCount) <= Number(requestValue) &&
        Number(identifier.minCount) <= Number(limitValue) &&
        // max is larger or equal
        Number(identifier.maxCount) >= Number(requestValue) &&
        Number(identifier.maxCount) >= Number(limitValue)
      );
    });

    const tolerationsMatch = profile.spec.scheduling?.node?.tolerations?.every((toleration) =>
      tolerations.some(
        (t) =>
          t.key === toleration.key &&
          t.value === toleration.value &&
          t.operator === toleration.operator &&
          t.effect === toleration.effect &&
          t.tolerationSeconds === toleration.tolerationSeconds,
      ),
    );

    const nodeSelectorMatch = Object.entries(
      profile.spec.scheduling?.node?.nodeSelector || {},
    ).every(([key, value]) => nodeSelector[key] === value);

    return identifiersMatch && tolerationsMatch && nodeSelectorMatch;
  });

  return matchingProfiles.length > 0 ? matchingProfiles[0] : undefined;
};

export const useHardwareProfileConfig = (
  existingHardwareProfileName?: string,
  resources?: ContainerResources,
  tolerations?: Toleration[],
  nodeSelector?: NodeSelector,
  visibleIn?: HardwareProfileFeatureVisibility[],
  resourceNamespace?: string,
  hardwareProfileNamespace?: string | null,
): UseHardwareProfileConfigResult => {
  const { dashboardNamespace } = useDashboardNamespace();
  const { currentProject } = React.useContext(ProjectDetailsContext);

  const {
    globalProfiles: [dashboardProfiles, dashboardProfilesLoaded, dashboardProfilesLoadError],
    projectProfiles: [
      projectScopedProfiles,
      projectScopedProfilesLoaded,
      projectScopedProfilesLoadError,
    ],
  } = useHardwareProfilesByFeatureVisibility(visibleIn, resourceNamespace);

  const initialHardwareProfile = useRef<HardwareProfileKind | undefined>(undefined);
  const [formData, setFormData, resetFormData] = useGenericObjectState<HardwareProfileConfig>({
    selectedProfile: undefined,
    useExistingSettings: false,
  });

  const profiles = [...dashboardProfiles, ...projectScopedProfiles];
  const profilesLoaded = dashboardProfilesLoaded && projectScopedProfilesLoaded;
  const profilesLoadError = dashboardProfilesLoadError || projectScopedProfilesLoadError;

  const isFormDataValid = React.useMemo(() => isHardwareProfileConfigValid(formData), [formData]);
  const { kueueFilteringState } = useKueueConfiguration(currentProject);

  React.useEffect(() => {
    if (!profilesLoaded || formData.selectedProfile) {
      return;
    }
    // only set form state if not already set
    if (!formData.resources) {
      let selectedProfile: HardwareProfileKind | undefined;

      // if editing, try to select existing profile
      if (resources) {
        // try to match to existing profile
        if (existingHardwareProfileName && hardwareProfileNamespace) {
          if (hardwareProfileNamespace === dashboardNamespace) {
            selectedProfile = dashboardProfiles.find(
              (profile) => profile.metadata.name === existingHardwareProfileName,
            );
          } else {
            selectedProfile = projectScopedProfiles.find(
              (profile) =>
                profile.metadata.name === existingHardwareProfileName &&
                profile.metadata.namespace === hardwareProfileNamespace,
            );
          }
        } else {
          selectedProfile = matchToHardwareProfile(profiles, resources, tolerations, nodeSelector);
        }

        initialHardwareProfile.current = selectedProfile;
        const mergedResources = selectedProfile
          ? mergeProfileIdentifiersIntoResources(resources, selectedProfile)
          : resources;
        setFormData('resources', mergedResources);
        setFormData('useExistingSettings', !selectedProfile);
        setFormData('selectedProfile', selectedProfile);
      }

      // if not editing existing profile, select the first enabled profile
      else {
        const filteredProfiles = filterProfilesByKueue(
          profiles.filter(isHardwareProfileEnabled),
          kueueFilteringState,
        );
        selectedProfile = filteredProfiles.length > 0 ? filteredProfiles[0] : undefined;
        if (selectedProfile) {
          setFormData('resources', getContainerResourcesFromHardwareProfile(selectedProfile));
          setFormData('selectedProfile', selectedProfile);
        }
      }
    }
  }, [
    existingHardwareProfileName,
    profiles,
    profilesLoaded,
    setFormData,
    resources,
    tolerations,
    nodeSelector,
    formData.resources,
    formData.selectedProfile,
    hardwareProfileNamespace,
    projectScopedProfiles,
    dashboardProfiles,
    dashboardNamespace,
    kueueFilteringState,
  ]);

  return {
    formData,
    initialHardwareProfile: initialHardwareProfile.current,
    isFormDataValid,
    setFormData,
    resetFormData,
    profilesLoaded,
    profilesLoadError,
  };
};

const mergeProfileIdentifiersIntoResources = (
  existingResources: ContainerResources,
  hardwareProfile: HardwareProfileKind,
): ContainerResources => {
  if (!hardwareProfile.spec.identifiers || hardwareProfile.spec.identifiers.length === 0) {
    return { requests: {}, limits: {} };
  }
  const profileResources = getContainerResourcesFromHardwareProfile(hardwareProfile);
  const profileIdentifierKeys = new Set(
    hardwareProfile.spec.identifiers.map((id) => id.identifier),
  );
  const mergedRequests = { ...(existingResources.requests || {}) };
  const mergedLimits = { ...(existingResources.limits || {}) };

  Object.keys(mergedRequests).forEach((key) => {
    if (!profileIdentifierKeys.has(key)) {
      delete mergedRequests[key];
    }
  });
  Object.keys(mergedLimits).forEach((key) => {
    if (!profileIdentifierKeys.has(key)) {
      delete mergedLimits[key];
    }
  });

  hardwareProfile.spec.identifiers.forEach((identifier) => {
    if (!(identifier.identifier in mergedRequests)) {
      mergedRequests[identifier.identifier] =
        profileResources.requests?.[identifier.identifier] ?? identifier.defaultCount;
    }
    if (!(identifier.identifier in mergedLimits)) {
      mergedLimits[identifier.identifier] =
        profileResources.limits?.[identifier.identifier] ?? identifier.defaultCount;
    }
  });
  return {
    requests: mergedRequests,
    limits: mergedLimits,
  };
};
