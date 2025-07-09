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
  // Check if this is a NIM serving runtime
  const containers = servingRuntime.spec.containers || [];
  
  return containers.some(container => 
    container.image?.includes('nvcr.io/nim/') ||
    container.image?.includes('nvidia/nim') ||
    servingRuntime.metadata.annotations?.['opendatahub.io/template-name'] === 'nvidia-nim-runtime'
  );
};

const extractPVCFromServingRuntime = (servingRuntime: ServingRuntimeKind): string | null => {
  // Look for PVC in volumes
  const volumes = servingRuntime.spec.volumes || [];
  
  for (const volume of volumes) {
    if (volume.persistentVolumeClaim?.claimName?.startsWith('nim-pvc')) {
      return volume.persistentVolumeClaim.claimName;
    }
  }
  
  return null;
};

const extractModelFromServingRuntime = (servingRuntime: ServingRuntimeKind): string | null => {
  // Check supportedModelFormats for the model name
  const supportedFormats = servingRuntime.spec.supportedModelFormats || [];
  
  if (supportedFormats.length > 0) {
    return supportedFormats[0].name;
  }
  
  // Fallback: try to extract from container image
  const containers = servingRuntime.spec.containers || [];
  for (const container of containers) {
    if (container.image?.includes('nvcr.io/nim/')) {
      // Extract model name from image like: nvcr.io/nim/meta/llama-3.1-8b-instruct:1.8.5
      const imageParts = container.image.split('/');
      if (imageParts.length >= 4) {
        const modelWithTag = imageParts.slice(3).join('/');
        const modelName = modelWithTag.split(':')[0];
        return modelName.replace(/\//g, '--'); // Convert namespace/model to namespace--model
      }
    }
  }
  
  return null;
};

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
        
        // Filter for NIM serving runtimes and extract PVC info
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
        
        // Filter for the selected model
        const compatible = nimPVCInfos.filter(info => 
          info.modelName === selectedModel ||
          info.modelName.includes(selectedModel) ||
          selectedModel.includes(info.modelName)
        );
        
        // Sort by creation date (newest first)
        const sorted = compatible.sort((a, b) => 
          b.createdAt.getTime() - a.createdAt.getTime()
        );
        
        setCompatiblePVCs(sorted);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch NIM PVCs');
        setCompatiblePVCs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNIMPVCs();
  }, [namespace, selectedModel]);

  return {
    compatiblePVCs,
    loading,
    error,
  };
};