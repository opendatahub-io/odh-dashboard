import React, { useRef } from 'react';
import {
  HardwareProfileFeatureVisibility,
  type HardwareProfileKind,
  ContainerResources,
  NodeSelector,
  Toleration,
} from '@odh-dashboard/k8s-core';
import type { UpdateObjectAtPropAndValue } from '@odh-dashboard/ui-core';
import useGenericObjectState from '@odh-dashboard/ui-core/utilities/useGenericObjectState';
import { isCpuLimitLarger, isMemoryLimitLarger } from '@odh-dashboard/ui-core/utilities/valueUnits';
import { useDashboardNamespace } from '@odh-dashboard/plugin-core';
import { CurrentProjectContext } from '@odh-dashboard/ui-core/context/CurrentProjectContext';
import { LocalQueuesContext } from '@odh-dashboard/ui-core/context/LocalQueuesContext';
import {
  computeLocalQueueNamesResult,
  filterProfilesByKueue,
  KueueFilteringState,
  useKueueConfiguration,
} from './kueueUtils';
import { isHardwareProfileConfigValid } from './validationUtils';
import {
  findHardwareProfileForBinding,
  getClaimTemplateMissingText,
  getContainerResourcesFromHardwareProfile,
  isHardwareProfileEnabled,
  isDRAHardwareProfile,
  isSameHardwareProfileBinding,
} from './utils';
import { useIsDRAHardwareProfileEnabled } from './useIsDRAHardwareProfileEnabled';
import {
  type ResourceClaimTemplateNamesResult,
  useResourceClaimTemplateNames,
} from './useResourceClaimTemplateNames';
import type { HardwareProfileBinding } from './types';
import { useHardwareProfilesByFeatureVisibility } from '../src/pages/useHardwareProfilesByFeatureVisibility';

export type HardwareProfileConfig = {
  selectedProfile?: HardwareProfileKind;
  useExistingSettings: boolean;
  resources?: ContainerResources;
};

export type UseHardwareProfileConfigResult = {
  formData: HardwareProfileConfig;
  initialHardwareProfile?: HardwareProfileKind;
  initialResources?: ContainerResources;
  existingBinding: HardwareProfileBinding;
  excludeDRAProfiles: boolean;
  claimTemplateNames?: ResourceClaimTemplateNamesResult;
  claimTemplateMissingText?: string;
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
  options: { allowDRAProfiles?: boolean | 'pending'; project?: string } = {},
): UseHardwareProfileConfigResult => {
  const isDRAEnabled = useIsDRAHardwareProfileEnabled();
  const requestedExcludeDRAProfiles =
    isDRAEnabled && options.allowDRAProfiles === 'pending'
      ? undefined
      : !(isDRAEnabled && options.allowDRAProfiles);
  const { dashboardNamespace } = useDashboardNamespace();
  const { currentProject } = React.useContext(CurrentProjectContext);
  const { localQueues } = React.useContext(LocalQueuesContext);

  const {
    globalProfiles: [dashboardProfiles, dashboardProfilesLoaded, dashboardProfilesLoadError],
    projectProfiles: [
      projectScopedProfiles,
      projectScopedProfilesLoaded,
      projectScopedProfilesLoadError,
    ],
  } = useHardwareProfilesByFeatureVisibility(visibleIn, resourceNamespace, { dra: 'all' });

  const initialHardwareProfile = useRef<HardwareProfileKind | undefined>(undefined);
  const initialResources = useRef<ContainerResources | undefined>(undefined);
  const [formData, setFormData, resetFormData] = useGenericObjectState<HardwareProfileConfig>({
    selectedProfile: undefined,
    useExistingSettings: false,
  });

  const [knownExcludeDRAProfiles, setKnownExcludeDRAProfiles] = React.useState(
    requestedExcludeDRAProfiles,
  );
  const excludeDRAProfiles = requestedExcludeDRAProfiles ?? knownExcludeDRAProfiles;

  const profiles = React.useMemo(
    () => [...dashboardProfiles, ...projectScopedProfiles],
    [dashboardProfiles, projectScopedProfiles],
  );
  const selectableProfiles = React.useMemo(
    () => profiles.filter((profile) => !isDRAHardwareProfile(profile)),
    [profiles],
  );
  const assignedProfile = React.useMemo(
    () =>
      findHardwareProfileForBinding(
        profiles,
        { name: existingHardwareProfileName, namespace: hardwareProfileNamespace || undefined },
        resourceNamespace,
        dashboardNamespace,
      ),
    [
      profiles,
      existingHardwareProfileName,
      hardwareProfileNamespace,
      resourceNamespace,
      dashboardNamespace,
    ],
  );
  const existingBinding = React.useMemo<HardwareProfileBinding>(
    () => ({
      name: existingHardwareProfileName,
      namespace: hardwareProfileNamespace || resourceNamespace,
    }),
    [existingHardwareProfileName, hardwareProfileNamespace, resourceNamespace],
  );

  const { selectedProfile: currentSelectedProfile } = formData;
  if (
    requestedExcludeDRAProfiles !== undefined &&
    requestedExcludeDRAProfiles !== knownExcludeDRAProfiles
  ) {
    setKnownExcludeDRAProfiles(requestedExcludeDRAProfiles);
    if (
      knownExcludeDRAProfiles !== undefined &&
      currentSelectedProfile &&
      isDRAHardwareProfile(currentSelectedProfile) &&
      (isSameHardwareProfileBinding(currentSelectedProfile.metadata, existingBinding) ||
        requestedExcludeDRAProfiles)
    ) {
      resetFormData();
    }
  }

  const profilesLoaded = dashboardProfilesLoaded && projectScopedProfilesLoaded;
  const profilesLoadError = dashboardProfilesLoadError || projectScopedProfilesLoadError;

  const claimTemplateNamespace =
    options.project &&
    excludeDRAProfiles === false &&
    ((!!currentSelectedProfile && isDRAHardwareProfile(currentSelectedProfile)) ||
      profiles.some(isDRAHardwareProfile))
      ? options.project
      : undefined;
  const claimTemplateNamesResult = useResourceClaimTemplateNames(claimTemplateNamespace);
  const claimTemplateNames = claimTemplateNamespace ? claimTemplateNamesResult : undefined;
  const claimTemplateMissingText =
    claimTemplateNames &&
    currentSelectedProfile &&
    isDRAHardwareProfile(currentSelectedProfile) &&
    !isSameHardwareProfileBinding(currentSelectedProfile.metadata, existingBinding)
      ? getClaimTemplateMissingText(currentSelectedProfile, claimTemplateNames)
      : undefined;

  const isFormDataValid = React.useMemo(
    () => isHardwareProfileConfigValid(formData) && !claimTemplateMissingText,
    [formData, claimTemplateMissingText],
  );
  const { kueueFilteringState } = useKueueConfiguration(currentProject);

  const { data: lqData, loaded: lqLoaded, error: lqError } = localQueues;
  const availableLocalQueueNames = React.useMemo(() => {
    const result = computeLocalQueueNamesResult({ data: lqData, loaded: lqLoaded, error: lqError });
    return result.status === 'ready' ? result.names : undefined;
  }, [lqData, lqLoaded, lqError]);

  React.useEffect(() => {
    if (!profilesLoaded || excludeDRAProfiles === undefined || formData.selectedProfile) {
      return;
    }
    // only set form state if not already set
    if (!formData.resources) {
      let selectedProfile: HardwareProfileKind | undefined;

      if (assignedProfile && isDRAHardwareProfile(assignedProfile)) {
        const existingResources: ContainerResources = {
          ...resources,
          requests: resources?.requests ?? {},
          limits: resources?.limits ?? {},
        };
        const hasExistingRequestsOrLimits =
          Object.keys(existingResources.requests ?? {}).length > 0 ||
          Object.keys(existingResources.limits ?? {}).length > 0;
        const assignedResources =
          !excludeDRAProfiles &&
          assignedProfile.spec.identifiers?.length &&
          hasExistingRequestsOrLimits
            ? mergeProfileIdentifiersIntoResources(existingResources, assignedProfile)
            : existingResources;
        initialHardwareProfile.current = assignedProfile;
        initialResources.current = assignedResources;
        setFormData('resources', assignedResources);
        setFormData('useExistingSettings', excludeDRAProfiles);
        setFormData('selectedProfile', assignedProfile);
        return;
      }

      // if editing, try to select existing profile
      if (resources) {
        // try to match to existing profile
        if (assignedProfile || (existingHardwareProfileName && hardwareProfileNamespace)) {
          selectedProfile = assignedProfile;
        } else if (!resources.claims?.length) {
          selectedProfile = matchToHardwareProfile(
            selectableProfiles,
            resources,
            tolerations,
            nodeSelector,
          );
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
        // Wait for localQueues to load before auto-selecting, so we don't pick a profile
        // whose localQueueName doesn't exist in the namespace. Fail-open on error.
        if (
          kueueFilteringState === KueueFilteringState.ONLY_KUEUE_PROFILES &&
          !lqLoaded &&
          !lqError
        ) {
          return;
        }
        const filteredProfiles = filterProfilesByKueue(
          selectableProfiles.filter(isHardwareProfileEnabled),
          kueueFilteringState,
          availableLocalQueueNames,
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
    selectableProfiles,
    profilesLoaded,
    setFormData,
    resources,
    tolerations,
    nodeSelector,
    formData.resources,
    formData.selectedProfile,
    hardwareProfileNamespace,
    assignedProfile,
    kueueFilteringState,
    availableLocalQueueNames,
    lqLoaded,
    lqError,
    excludeDRAProfiles,
  ]);

  return {
    formData,
    initialHardwareProfile: initialHardwareProfile.current,
    initialResources: initialResources.current,
    existingBinding,
    excludeDRAProfiles: excludeDRAProfiles ?? true,
    claimTemplateNames,
    claimTemplateMissingText,
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
  const claims = existingResources.claims?.length ? { claims: existingResources.claims } : {};
  if (!hardwareProfile.spec.identifiers || hardwareProfile.spec.identifiers.length === 0) {
    return { requests: {}, limits: {}, ...claims };
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
    ...claims,
  };
};
