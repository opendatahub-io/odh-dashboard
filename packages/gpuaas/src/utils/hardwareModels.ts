import {
  ClusterQueueKind,
  type HardwareProfileKind,
  IdentifierResourceType,
  type PodKind,
  ResourceFlavorKind,
} from '@odh-dashboard/k8s-core';
import parseK8sQuantity from './parseK8sQuantity';
import { ACCELERATOR_RESOURCE_REGEX } from '../const';

const ACCELERATOR_RE = new RegExp(ACCELERATOR_RESOURCE_REGEX);

const GPU_PRODUCT_LABELS = [
  'nvidia.com/gpu.product',
  'amd.com/gpu.product',
  'intel.com/gpu.product',
] as const;

export const UNKNOWN_ACCELERATOR = 'Unknown accelerator';

export const getAcceleratorDisplayName = (
  resourceFlavor: ResourceFlavorKind | undefined,
  resourceFlavorName: string | undefined,
  acceleratorResourceName: string | undefined,
): string => {
  const productLabel = GPU_PRODUCT_LABELS.map(
    (label) => resourceFlavor?.spec.nodeLabels?.[label],
  ).find((value) => Boolean(value));

  return productLabel || resourceFlavorName || acceleratorResourceName || UNKNOWN_ACCELERATOR;
};

/** Same annotation pair the dashboard stamps on notebook Pod templates when a HardwareProfile is assigned. */
export const HARDWARE_PROFILE_NAME_ANNOTATION = 'opendatahub.io/hardware-profile-name';
export const HARDWARE_PROFILE_NAMESPACE_ANNOTATION = 'opendatahub.io/hardware-profile-namespace';

export type HardwareProfileRef = { name: string; namespace: string };

export const buildHardwareProfileKey = ({ name, namespace }: HardwareProfileRef): string =>
  `${namespace}/${name}`;

/** Reads the dashboard's hardware-profile annotation pair from any annotation map. */
export const getHardwareProfileRefFromAnnotations = (
  annotations?: Record<string, string>,
): HardwareProfileRef | undefined => {
  const name = annotations?.[HARDWARE_PROFILE_NAME_ANNOTATION];
  const namespace = annotations?.[HARDWARE_PROFILE_NAMESPACE_ANNOTATION];
  return name && namespace ? { name, namespace } : undefined;
};

/** Reads the dashboard's hardware-profile annotation pair off a Pod, if present. */
export const getHardwareProfileRefFromPod = (pod: PodKind): HardwareProfileRef | undefined =>
  getHardwareProfileRefFromAnnotations(pod.metadata.annotations);

/** The accelerator resource identifier (e.g. "nvidia.com/gpu") on a HardwareProfile, if any. */
export const getHardwareProfileAcceleratorIdentifier = (
  hardwareProfile: HardwareProfileKind,
): string | undefined =>
  hardwareProfile.spec.identifiers?.find(
    (identifier) => identifier.resourceType === IdentifierResourceType.ACCELERATOR,
  )?.identifier;

/** Mirrors the dashboard-wide HardwareProfile display-name convention (name falls back to metadata.name). */
export const getHardwareProfileDisplayName = (hardwareProfile: HardwareProfileKind): string =>
  hardwareProfile.metadata.annotations?.['opendatahub.io/display-name'] ||
  hardwareProfile.metadata.name;

/** HardwareProfile CRs referenced by workload Pods, keyed by `${namespace}/${name}`. */
export type HardwareProfileByKey = Map<string, HardwareProfileKind>;

export type WorkloadHardwareProfileInfo = {
  displayName: string;
  acceleratorIdentifier?: string;
};

/**
 * Resolves a workload's hardware profile from the real HardwareProfile CR referenced by a
 * `opendatahub.io/hardware-profile-name` annotation (the same mechanism Notebooks use), when present.
 */
export const resolveWorkloadHardwareProfileFromAnnotation = (
  annotationSources: Array<Record<string, string> | undefined>,
  hardwareProfileByKey: Map<string, HardwareProfileKind>,
): WorkloadHardwareProfileInfo | undefined => {
  for (const annotations of annotationSources) {
    const ref = getHardwareProfileRefFromAnnotations(annotations);
    if (!ref) {
      continue;
    }
    const hardwareProfile = hardwareProfileByKey.get(buildHardwareProfileKey(ref));
    if (hardwareProfile) {
      return {
        displayName: getHardwareProfileDisplayName(hardwareProfile),
        acceleratorIdentifier: getHardwareProfileAcceleratorIdentifier(hardwareProfile),
      };
    }
  }
  return undefined;
};

export type ModelGpuCount = {
  model: string;
  used: number;
  nominal: number;
  borrowed?: number;
};

/**
 * Resolves hardware model names for each ClusterQueue by mapping through
 * its referenced ResourceFlavors' nodeLabels.
 *
 * @returns Map of CQ name -> array of hardware model names (e.g., ["NVIDIA A100"])
 */
export const resolveHardwareModels = (
  clusterQueues: ClusterQueueKind[],
  resourceFlavors: ResourceFlavorKind[],
): Map<string, string[]> => {
  const flavorMap = new Map(resourceFlavors.map((rf) => [rf.metadata?.name ?? '', rf]));

  const result = new Map<string, string[]>();

  for (const cq of clusterQueues) {
    const models = new Set<string>();

    for (const rg of cq.spec.resourceGroups ?? []) {
      for (const flavor of rg.flavors) {
        const rf = flavorMap.get(flavor.name);
        if (!rf?.spec.nodeLabels) {
          continue;
        }
        for (const label of GPU_PRODUCT_LABELS) {
          const value = rf.spec.nodeLabels[label];
          if (value) {
            models.add(value);
          }
        }
      }
    }

    const cqName = cq.metadata?.name ?? '';
    if (cqName) {
      result.set(cqName, [...models]);
    }
  }

  return result;
};

/** Returns a map of CQ name → per-model GPU counts (nominal, used, borrowed). */
export const resolvePerModelGpuCounts = (
  clusterQueues: ClusterQueueKind[],
  resourceFlavors: ResourceFlavorKind[],
): Map<string, ModelGpuCount[]> => {
  const flavorMap = new Map(resourceFlavors.map((rf) => [rf.metadata?.name ?? '', rf]));

  const result = new Map<string, ModelGpuCount[]>();

  for (const cq of clusterQueues) {
    const countsByModel = new Map<string, ModelGpuCount>();

    for (const rg of cq.spec.resourceGroups ?? []) {
      for (const flavor of rg.flavors) {
        const rf = flavorMap.get(flavor.name);
        const nominalRes = flavor.resources.find((r) => ACCELERATOR_RE.test(r.name));
        if (!nominalRes) {
          continue;
        }
        const model = getAcceleratorDisplayName(rf, flavor.name, nominalRes.name);

        const usageEntry = cq.status?.flavorsUsage?.find((f) => f.name === flavor.name);
        const usedRes = usageEntry?.resources.find((r) => ACCELERATOR_RE.test(r.name));

        const nominal = parseK8sQuantity(nominalRes.nominalQuota);
        const used = parseK8sQuantity(usedRes?.total ?? '0');
        const borrowed =
          usedRes?.borrowed !== undefined ? parseK8sQuantity(usedRes.borrowed) : undefined;

        const existing = countsByModel.get(model);
        if (existing) {
          existing.nominal += nominal;
          existing.used += used;
          if (borrowed !== undefined) {
            existing.borrowed = (existing.borrowed ?? 0) + borrowed;
          }
        } else {
          countsByModel.set(model, { model, nominal, used, borrowed });
        }
      }
    }

    const cqName = cq.metadata?.name ?? '';
    if (cqName) {
      result.set(cqName, [...countsByModel.values()]);
    }
  }

  return result;
};
