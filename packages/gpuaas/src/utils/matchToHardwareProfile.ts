import {
  TolerationOperator,
  type ContainerResources,
  type HardwareProfileKind,
  type NodeSelector,
  type Toleration,
} from '@odh-dashboard/k8s-core';
import { isCpuLimitLarger, isMemoryLimitLarger } from '@odh-dashboard/ui-core/utilities/valueUnits';

const normalizeTolerationOperator = (operator?: Toleration['operator']): TolerationOperator =>
  operator ?? TolerationOperator.EQUAL;

const tolerationEffectsMatch = (
  workloadEffect?: Toleration['effect'],
  profileEffect?: Toleration['effect'],
): boolean => !workloadEffect || !profileEffect || workloadEffect === profileEffect;

const tolerationsMatchPair = (workload: Toleration, profile: Toleration): boolean => {
  const workloadOperator = normalizeTolerationOperator(workload.operator);
  const profileOperator = normalizeTolerationOperator(profile.operator);

  return (
    workload.key === profile.key &&
    workloadOperator === profileOperator &&
    (workloadOperator === TolerationOperator.EXISTS || workload.value === profile.value) &&
    tolerationEffectsMatch(workload.effect, profile.effect)
  );
};

/**
 * Gpuaas-local copy of `matchToHardwareProfile` from `useHardwareProfileConfig` — same logic
 * workbench and model serving use today. Kept here so Quota usage display stays gpuaas-scoped;
 * extract to `@odh-dashboard/hardware-profiles` (and fix tolerations matching) in follow-up.
 */
export const matchToHardwareProfile = (
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
          isCpuLimitLarger(requestValue, identifier.maxCount, true) &&
          isCpuLimitLarger(limitValue, identifier.maxCount, true) &&
          isCpuLimitLarger(identifier.minCount, requestValue, true) &&
          isCpuLimitLarger(identifier.minCount, limitValue, true)
        );
      }

      if (identifier.identifier === 'memory') {
        return (
          (!identifier.maxCount ||
            (isMemoryLimitLarger(requestValue.toString(), identifier.maxCount.toString(), true) &&
              isMemoryLimitLarger(limitValue.toString(), identifier.maxCount.toString(), true))) &&
          isMemoryLimitLarger(identifier.minCount.toString(), requestValue.toString(), true) &&
          isMemoryLimitLarger(identifier.minCount.toString(), limitValue.toString(), true)
        );
      }

      return (
        Number(identifier.minCount) <= Number(requestValue) &&
        Number(identifier.minCount) <= Number(limitValue) &&
        Number(identifier.maxCount) >= Number(requestValue) &&
        Number(identifier.maxCount) >= Number(limitValue)
      );
    });

    const tolerationsMatch = (profile.spec.scheduling?.node?.tolerations ?? []).every(
      (profileToleration) =>
        tolerations.some((workloadToleration) =>
          tolerationsMatchPair(workloadToleration, profileToleration),
        ),
    );

    const nodeSelectorMatch = Object.entries(
      profile.spec.scheduling?.node?.nodeSelector || {},
    ).every(([key, value]) => nodeSelector[key] === value);

    return identifiersMatch && tolerationsMatch && nodeSelectorMatch;
  });

  return matchingProfiles.length > 0 ? matchingProfiles[0] : undefined;
};
