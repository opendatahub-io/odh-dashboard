import {
  type HardwareProfileKind,
  HardwareProfileFeatureVisibility,
  type WorkloadKind,
} from '@odh-dashboard/k8s-core';
import { matchToHardwareProfile } from './matchToHardwareProfile';
import {
  extractWorkloadPodSpecOptions,
  type WorkloadPodSpecOptions,
} from './extractWorkloadPodSpecOptions';
import {
  getHardwareProfileAcceleratorIdentifier,
  getHardwareProfileDisplayName,
  resolveWorkloadHardwareProfileFromAnnotation,
  type HardwareProfileByKey,
  type WorkloadHardwareProfileInfo,
} from './hardwareModels';
import type { WorkloadInferenceService } from '../types/inferenceService';
import { QuotaUsageWorkloadTypes, type QuotaUsageWorkloadType } from '../types';

const WORKBENCH_VISIBILITY = [HardwareProfileFeatureVisibility.WORKBENCH];
const MODEL_SERVING_VISIBILITY = [HardwareProfileFeatureVisibility.MODEL_SERVING];

const isHardwareProfileEnabled = (hardwareProfile: HardwareProfileKind): boolean =>
  hardwareProfile.metadata.annotations?.['opendatahub.io/disabled'] === 'false' ||
  hardwareProfile.metadata.annotations?.['opendatahub.io/disabled'] === undefined;

/** Mirrors `filterHardwareProfileByFeatureVisibility` from hardware-profiles pages (no React hooks). */
export const filterHardwareProfilesByVisibility = (
  hardwareProfiles: HardwareProfileKind[],
  visibility?: HardwareProfileFeatureVisibility[],
): HardwareProfileKind[] =>
  hardwareProfiles.filter((profile) => {
    if (!isHardwareProfileEnabled(profile)) {
      return false;
    }
    const visibilityAnnotation =
      profile.metadata.annotations?.['opendatahub.io/dashboard-feature-visibility'];
    if (!visibilityAnnotation) {
      return true;
    }
    try {
      const visibleIn: string[] = JSON.parse(visibilityAnnotation);
      if (visibleIn.length === 0) {
        return true;
      }
      return visibility ? visibility.some((entry) => visibleIn.includes(entry)) : true;
    } catch {
      return true;
    }
  });

const visibilityForWorkloadType = (
  workloadType: QuotaUsageWorkloadType,
): HardwareProfileFeatureVisibility[] => {
  if (workloadType === QuotaUsageWorkloadTypes.Serve) {
    return MODEL_SERVING_VISIBILITY;
  }
  if (workloadType === QuotaUsageWorkloadTypes.Workbench) {
    return WORKBENCH_VISIBILITY;
  }
  return [...WORKBENCH_VISIBILITY, ...MODEL_SERVING_VISIBILITY];
};

const toProfileInfo = (hardwareProfile: HardwareProfileKind): WorkloadHardwareProfileInfo => ({
  displayName: getHardwareProfileDisplayName(hardwareProfile),
  acceleratorIdentifier: getHardwareProfileAcceleratorIdentifier(hardwareProfile),
});

/**
 * Model-serving pod spec options — same fields `extractHardwareProfileConfigFromInferenceService`
 * passes into `useHardwareProfileConfig` for resource-based profile matching.
 */
export const extractInferenceServicePodSpecOptions = (
  inferenceService: WorkloadInferenceService,
): WorkloadPodSpecOptions => ({
  resources: inferenceService.spec?.predictor?.model?.resources,
  tolerations: inferenceService.spec?.predictor?.tolerations,
  nodeSelector: inferenceService.spec?.predictor?.nodeSelector,
});

export type WorkloadHardwareProfileResolverContext = {
  annotationSources: Array<Record<string, string> | undefined>;
  inferenceService?: WorkloadInferenceService;
  hardwareProfileByKey: HardwareProfileByKey;
  hardwareProfilesForMatching: HardwareProfileKind[];
  workloadType: QuotaUsageWorkloadType;
};

const matchProfileFromPodSpec = (
  hardwareProfiles: HardwareProfileKind[],
  visibility: HardwareProfileFeatureVisibility[],
  podSpec: ReturnType<typeof extractWorkloadPodSpecOptions>,
): HardwareProfileKind | undefined => {
  const candidates = filterHardwareProfilesByVisibility(hardwareProfiles, visibility);
  return matchToHardwareProfile(
    candidates,
    podSpec.resources,
    podSpec.tolerations,
    podSpec.nodeSelector,
  );
};

/**
 * Resolves hardware profile for a Quota usage workload row using the same strategies as Notebooks
 * (annotation on owner pod template) and Model Serving (annotation on ISVC, else resource match).
 */
export const resolveWorkloadHardwareProfileForRow = (
  workload: WorkloadKind,
  {
    annotationSources,
    inferenceService,
    hardwareProfileByKey,
    hardwareProfilesForMatching,
    workloadType,
  }: WorkloadHardwareProfileResolverContext,
): WorkloadHardwareProfileInfo | undefined => {
  const configuredProfile = resolveWorkloadHardwareProfileFromAnnotation(
    annotationSources,
    hardwareProfileByKey,
  );
  if (configuredProfile) {
    return configuredProfile;
  }

  const visibility = visibilityForWorkloadType(workloadType);

  if (inferenceService) {
    const servingMatch = matchProfileFromPodSpec(
      hardwareProfilesForMatching,
      visibility,
      extractInferenceServicePodSpecOptions(inferenceService),
    );
    if (servingMatch) {
      return toProfileInfo(servingMatch);
    }
  }

  const workloadMatch = matchProfileFromPodSpec(
    hardwareProfilesForMatching,
    visibility,
    extractWorkloadPodSpecOptions(workload),
  );
  if (workloadMatch) {
    return toProfileInfo(workloadMatch);
  }

  return undefined;
};
