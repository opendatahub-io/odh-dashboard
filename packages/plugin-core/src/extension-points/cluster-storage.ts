import type { PersistentVolumeClaimKind, ProjectKind } from '@odh-dashboard/k8s-core';
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

export type ClusterStorageConnectedResources<TData = unknown> = {
  loaded: boolean;
  data: TData;
};

export type ConnectedResourceKind = 'connected-models';

export type ConnectedResourceLabel = {
  /** Stable identity for React reconciliation (e.g. the resource name). */
  key: string;
  /** Human-meaningful text shown on the label. */
  title: string;
  /** Which kind of resource this is; the host maps it to an icon and color. */
  kind: ConnectedResourceKind;
};

export type ClusterStorageConnectedResourcesProperties<TData = unknown> = {
  /**
   * Hook listing the project resources that may be connected to a PVC.
   */
  useConnectedResources: CodeRef<(project: ProjectKind) => ClusterStorageConnectedResources<TData>>;
  /**
   * Given a PVC and the data fetched by `useConnectedResources`, returns label descriptors for the
   * resources connected to that PVC (empty when none).
   */
  getConnectedResources: CodeRef<
    (pvc: PersistentVolumeClaimKind, data: TData) => ConnectedResourceLabel[]
  >;
};

/**
 * Contributes "connected resources" to the cluster storage table: a feature package lists its own
 * resources for the project (e.g. KServe ServingRuntimes) and renders which ones reference a given
 * PVC, without the host knowing about those resource types.
 */
export type ClusterStorageConnectedResourcesExtension<TData = unknown> = Extension<
  'app.cluster-storage/connected-resources',
  ClusterStorageConnectedResourcesProperties<TData>
>;

export const isClusterStorageConnectedResourcesExtension =
  createExtensionGuard<ClusterStorageConnectedResourcesExtension>(
    'app.cluster-storage/connected-resources',
  );
