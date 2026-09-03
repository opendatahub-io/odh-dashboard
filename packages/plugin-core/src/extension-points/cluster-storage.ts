import type { PersistentVolumeClaimKind } from '@odh-dashboard/k8s-core';
import type { CodeRef, Extension } from '@openshift/dynamic-plugin-sdk';
// eslint-disable-next-line no-restricted-syntax
import { createExtensionGuard } from './utils';

export type ClusterStorageContextProperties = {
  /** Display name of the storage context, shown in the storage table and the PVC form. */
  title: string;
  /** Optional help text describing when to use this storage context. */
  description?: string;
  /** Returns `true` when the given PVC belongs to this storage context. */
  isPVCUsingStorageContextType: CodeRef<(pvc: PersistentVolumeClaimKind) => boolean>;
};

/**
 * Contributes a storage context type (e.g. "NIM storage") to the cluster storage tab and the
 * cluster storage form, letting feature packages label their own PVCs without the host knowing
 * about them.
 */
export type ClusterStorageContextExtension = Extension<
  'app.cluster-storage/storage-context',
  ClusterStorageContextProperties
>;

export const isClusterStorageContextExtension =
  createExtensionGuard<ClusterStorageContextExtension>('app.cluster-storage/storage-context');
