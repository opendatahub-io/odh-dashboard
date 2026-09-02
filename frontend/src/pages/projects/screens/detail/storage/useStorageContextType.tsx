import React from 'react';
import { EitherNotBoth } from '@odh-dashboard/foundation';
import { PersistentVolumeClaimKind } from '@odh-dashboard/k8s-core';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import {
  ClusterStorageContextExtension,
  isClusterStorageContextExtension,
} from '@odh-dashboard/plugin-core/extension-points';
import { isModelStorage } from './utils';

export type StorageContextType = {
  title: string;
  description?: string;
} & EitherNotBoth<
  { isPVCUsingStorageContextType: (pvc: PersistentVolumeClaimKind) => boolean },
  { isDefaultType: boolean }
>;

export const GENERAL_PURPOSE_PVC_CONTEXT_TYPE: StorageContextType = {
  title: 'General purpose',
  description: 'Appropriate for all use cases.',
  isDefaultType: true,
};

export const MODEL_STORAGE_PVC_CONTEXT_TYPE: StorageContextType = {
  title: 'Model storage',
  description: 'Appropriate for model storage. Enables you to define the model name and path.',
  isPVCUsingStorageContextType: isModelStorage,
};

export const useStorageContextType = (): [
  storageContextTypes: StorageContextType[],
  loaded: boolean,
] => {
  const [extensions, loaded] = useResolvedExtensions<ClusterStorageContextExtension>(
    isClusterStorageContextExtension,
  );

  const storageContextTypes = React.useMemo(
    () => [
      GENERAL_PURPOSE_PVC_CONTEXT_TYPE,
      MODEL_STORAGE_PVC_CONTEXT_TYPE,
      ...extensions
        .map(
          ({ properties }): StorageContextType => ({
            title: properties.title,
            description: properties.description,
            isPVCUsingStorageContextType: properties.isPVCUsingStorageContextType,
          }),
        )
        .toSorted((a, b) => a.title.localeCompare(b.title)),
    ],
    [extensions],
  );

  return [storageContextTypes, loaded];
};

export const getPVCContextStorageType = (
  pvc: PersistentVolumeClaimKind,
  types?: StorageContextType[],
): StorageContextType => {
  for (const context of types ?? []) {
    if (context.isPVCUsingStorageContextType?.(pvc)) {
      return context;
    }
  }

  return GENERAL_PURPOSE_PVC_CONTEXT_TYPE;
};

export const getContextStorageTypeExplanation = (types: StorageContextType[]): string =>
  `The context indicates the purpose of the storage: ${new Intl.ListFormat('en', {
    type: 'disjunction',
  }).format(types.map((value) => value.title.toLocaleLowerCase()))}.`;
