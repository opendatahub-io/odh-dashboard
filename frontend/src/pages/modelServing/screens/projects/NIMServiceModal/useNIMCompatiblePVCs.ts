import React from 'react';
import { ServingRuntimeKind } from '#~/k8sTypes';
import { listServingRuntimes } from '#~/api';

export type NIMPVCInfo = {
  pvcName: string;
  modelName: string;
  servingRuntimeName: string;
  createdAt: Date;
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

export const useNIMCompatiblePVCs = (
  namespace: string | undefined,
  selectedModel: string | undefined,
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
        // Get all serving runtimes in the namespace
        const servingRuntimes = await listServingRuntimes(namespace);

        // Collect NIM runtimes with PVC + model info
        const nimPVCInfos: NIMPVCInfo[] = [];
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
            });
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
  }, [namespace, selectedModel]);

  return { compatiblePVCs, loading, error };
};