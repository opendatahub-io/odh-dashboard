import {
  TolerationEffect,
  TolerationOperator,
  type ContainerResources,
  type NodeSelector,
  type Toleration,
  type WorkloadKind,
} from '@odh-dashboard/k8s-core';
import { isAcceleratorResource } from './clusterQueueUtils';

type WorkloadPodToleration = NonNullable<
  WorkloadKind['spec']['podSets'][number]['template']['spec']['tolerations']
>[number];

const isTolerationOperator = (value?: string): value is TolerationOperator =>
  value === TolerationOperator.EXISTS || value === TolerationOperator.EQUAL;

const isTolerationEffect = (value?: string): value is TolerationEffect =>
  value === TolerationEffect.NO_SCHEDULE ||
  value === TolerationEffect.PREFER_NO_SCHEDULE ||
  value === TolerationEffect.NO_EXECUTE;

const mapWorkloadTolerations = (
  tolerations?: WorkloadPodToleration[],
): Toleration[] | undefined => {
  if (!tolerations) {
    return undefined;
  }

  return tolerations.flatMap((toleration) => {
    const operator = isTolerationOperator(toleration.operator) ? toleration.operator : undefined;

    // Kubernetes permits an empty key for an Exists toleration; it matches taints regardless of
    // key and must not be discarded before hardware-profile matching.
    if (!toleration.key && operator !== TolerationOperator.EXISTS) {
      return [];
    }

    return [
      {
        key: toleration.key ?? '',
        operator,
        value: toleration.value,
        effect: isTolerationEffect(toleration.effect) ? toleration.effect : undefined,
        tolerationSeconds: toleration.tolerationSeconds,
      },
    ];
  });
};

/** Pod spec options extracted from the first Kueue Workload podSet (same shape Model Serving passes to profile matching). */
export type WorkloadPodSpecOptions = {
  resources?: ContainerResources;
  tolerations?: Toleration[];
  nodeSelector?: NodeSelector;
};

/**
 * Reads container resources, tolerations, and node selector from a Workload's primary podSet
 * template — the workload-native equivalent of `extractHardwareProfileConfigFromInferenceService`.
 */
export const extractWorkloadPodSpecOptions = (workload: WorkloadKind): WorkloadPodSpecOptions => {
  if (workload.spec.podSets.length === 0) {
    return {};
  }

  const podSet = workload.spec.podSets[0];

  const { spec } = podSet.template;
  const container =
    spec.containers.find((candidate) => {
      const requests = candidate.resources?.requests ?? {};
      const limits = candidate.resources?.limits ?? {};
      return [...Object.keys(requests), ...Object.keys(limits)].some((name) =>
        isAcceleratorResource(name),
      );
    }) ?? spec.containers[0];

  return {
    resources: container.resources,
    tolerations: mapWorkloadTolerations(spec.tolerations),
    nodeSelector: spec.nodeSelector,
  };
};

/** Primary accelerator resource name from Workload podSet containers (e.g. nvidia.com/gpu). */
export const getWorkloadPrimaryAcceleratorIdentifier = (
  workload: WorkloadKind,
): string | undefined => {
  for (const podSet of workload.spec.podSets) {
    for (const container of podSet.template.spec.containers) {
      const requests = container.resources?.requests ?? {};
      const limits = container.resources?.limits ?? {};
      for (const name of new Set([...Object.keys(requests), ...Object.keys(limits)])) {
        if (isAcceleratorResource(name)) {
          return name;
        }
      }
    }
  }
  return undefined;
};
