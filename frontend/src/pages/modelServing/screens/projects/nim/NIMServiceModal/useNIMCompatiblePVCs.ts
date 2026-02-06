import React from 'react';
import { ServingRuntimeKind, NIMServiceKind } from '#~/k8sTypes';
import { listServingRuntimes, listNIMServices } from '#~/api';

export type NIMPVCInfo = {
  pvcName: string;
  modelName: string;
  servingRuntimeName: string; // Source deployment name (ServingRuntime or NIMService)
  createdAt: Date;
  deploymentType: 'operator' | 'legacy'; // Track which mode created this PVC
};

type UseNIMCompatiblePVCsState = {
  compatiblePVCs: NIMPVCInfo[];
  loading: boolean;
  error?: string;
};

const isNIMServingRuntime = (servingRuntime: ServingRuntimeKind): boolean => {
  const { containers } = servingRuntime.spec;

  return containers.some(
    (container) =>
      container.image?.includes('nvcr.io/nim/') ||
      container.image?.includes('nvidia/nim/') ||
      servingRuntime.metadata.annotations?.['opendatahub.io/template-name'] ===
        'nvidia-nim-runtime',
  );
};

const extractPVCFromServingRuntime = (servingRuntime: ServingRuntimeKind): string | null => {
  const { volumes } = servingRuntime.spec;
  if (!volumes) {
    return null;
  }

  for (const volume of volumes) {
    const claim = volume.persistentVolumeClaim?.claimName;
    if (claim?.startsWith('nim-pvc')) {
      return claim;
    }
  }
  return null;
};

const parseNimModelFromImage = (image: string): string | null => {
  const m = image.match(/(?:^|\/)nim\/([^:@]+)(?::[^@]+)?(?:@.+)?$/);
  return m?.[1] ? m[1].replace(/\//g, '--') : null;
};

const extractModelFromServingRuntime = (servingRuntime: ServingRuntimeKind): string | null => {
  const supportedFormats = servingRuntime.spec.supportedModelFormats;
  if (supportedFormats?.length && supportedFormats[0]?.name) {
    return supportedFormats[0].name;
  }

  const { containers } = servingRuntime.spec;
  for (const container of containers) {
    const parsed = parseNimModelFromImage(container.image ?? '');
    if (parsed) {
      return parsed;
    }
  }
  return null;
};

const normalizeModel = (m: string | undefined | null) => (m ?? '').trim().toLowerCase();

/**
 * Extract PVC name from NIMService storage configuration
 */
const extractPVCFromNIMService = (nimService: NIMServiceKind): string | null => {
  const pvcName = nimService.spec.storage?.pvc?.name;
  if (!pvcName) {
    return null;
  }

  // Only return PVCs that follow nim-pvc naming convention
  if (pvcName.startsWith('nim-pvc')) {
    return pvcName;
  }

  return pvcName; // Return all PVCs for operator mode
};

/**
 * Extract model name from NIMService image configuration
 * Returns the model name in ConfigMap format (without namespace prefix)
 * Example: nvcr.io/nim/meta/llama-3.1-8b-instruct → llama-3.1-8b-instruct
 */
const extractModelFromNIMService = (nimService: NIMServiceKind): string | null => {
  const { repository, tag } = nimService.spec.image;
  if (!repository) {
    return null;
  }

  // Construct full image path for parsing
  const fullImage = tag ? `${repository}:${tag}` : repository;

  // Parse to get the full path after "nim/"
  const parsed = parseNimModelFromImage(fullImage);
  if (!parsed) {
    return null;
  }

  // For NIM Operator, extract just the model name without namespace
  // Example: "meta--llama-3.1-8b-instruct" → "llama-3.1-8b-instruct"
  // This matches the ConfigMap key format and what the UI sends
  const lastSlashIndex = parsed.lastIndexOf('--');
  if (lastSlashIndex !== -1) {
    // Has namespace prefix (e.g., "meta--llama-3.1-8b-instruct")
    return parsed.substring(lastSlashIndex + 2); // Skip the "--"
  }

  // No namespace prefix, return as-is
  return parsed;
};

export const useNIMCompatiblePVCs = (
  namespace: string | undefined,
  selectedModel: string | undefined,
  nimServicesEnabled = false, // NEW: Mode awareness
): UseNIMCompatiblePVCsState => {
  const [compatiblePVCs, setCompatiblePVCs] = React.useState<NIMPVCInfo[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string>();

  React.useEffect(() => {
    const fetchNIMPVCs = async () => {
      if (!namespace || !selectedModel) {
        setCompatiblePVCs([]);
        return;
      }

      setLoading(true);
      setError(undefined);

      try {
        const nimPVCInfos: NIMPVCInfo[] = [];

        if (nimServicesEnabled) {
          // ===== NIM OPERATOR MODE: Scan NIMServices =====
          const nimServices = await listNIMServices(namespace);

          for (const nimService of nimServices) {
            const pvcName = extractPVCFromNIMService(nimService);
            const modelName = extractModelFromNIMService(nimService);

            if (pvcName && modelName) {
              nimPVCInfos.push({
                pvcName,
                modelName,
                servingRuntimeName: nimService.metadata.name,
                createdAt: new Date(nimService.metadata.creationTimestamp || Date.now()),
                deploymentType: 'operator',
              });
            }
          }
        } else {
          // ===== LEGACY MODE: Scan ServingRuntimes =====
          const servingRuntimes = await listServingRuntimes(namespace);

          for (const servingRuntime of servingRuntimes) {
            if (!isNIMServingRuntime(servingRuntime)) {
              continue;
            }

            const pvcName = extractPVCFromServingRuntime(servingRuntime);
            const modelName = extractModelFromServingRuntime(servingRuntime);

            if (pvcName && modelName) {
              nimPVCInfos.push({
                pvcName,
                modelName,
                servingRuntimeName: servingRuntime.metadata.name,
                createdAt: new Date(servingRuntime.metadata.creationTimestamp || Date.now()),
                deploymentType: 'legacy',
              });
            }
          }
        }

        // Filter by selected model (normalized)
        const target = normalizeModel(selectedModel);
        const compatible = nimPVCInfos.filter((info) => normalizeModel(info.modelName) === target);

        // Sort newest first
        const sorted = compatible.toSorted((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

        // Dedupe by pvcName AFTER sorting so newest wins
        const seen = new Set<string>();
        const dedupedNewestFirst = sorted.filter((info) => {
          if (seen.has(info.pvcName)) {
            return false;
          }
          seen.add(info.pvcName);
          return true;
        });

        setCompatiblePVCs(dedupedNewestFirst);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch NIM PVCs');
        setCompatiblePVCs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNIMPVCs();
  }, [namespace, selectedModel, nimServicesEnabled]);

  return { compatiblePVCs, loading, error };
};
