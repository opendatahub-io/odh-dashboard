import * as React from 'react';
import type { PersistentVolumeClaimKind, ProjectKind } from '@odh-dashboard/k8s-core';
import { HookNotify, useExtensions, useResolvedExtensions } from '@odh-dashboard/plugin-core';
import {
  isClusterStorageConnectedResourcesExtension,
  type ClusterStorageConnectedResources,
  type ConnectedResourceLabel,
} from '@odh-dashboard/plugin-core/extension-points';

export type ClusterStorageConnectedResourcesResult = {
  /** Whether any package contributes connected resources — drives the column's visibility. */
  hasExtensions: boolean;
  /** True once every contributed hook has reported loaded. */
  loaded: boolean;
  /** Merged per-PVC label descriptors contributed by all extensions. */
  getConnectedResourceLabels: (pvc: PersistentVolumeClaimKind) => ConnectedResourceLabel[];
  /** HookNotify elements the caller MUST render so each extension's list hook runs once. */
  hookNotifications: React.ReactNode;
};

/**
 * Encapsulates the cluster-storage "connected resources" extension plumbing for the storage table:
 * resolves the contributed extensions, runs each one's list hook exactly once (via HookNotify),
 * tracks their fetched data, and exposes a per-row label lookup plus an aggregate `loaded` flag.
 */
export const useClusterStorageConnectedResources = (
  project: ProjectKind,
): ClusterStorageConnectedResourcesResult => {
  const extensions = useExtensions(isClusterStorageConnectedResourcesExtension);
  const [resolvedExtensions, resolved] = useResolvedExtensions(
    isClusterStorageConnectedResourcesExtension,
  );
  const [connectedResourceData, setConnectedResourceData] = React.useState<
    Record<string, ClusterStorageConnectedResources | undefined>
  >({});

  const hasExtensions = extensions.length > 0;

  // Shortcut: no extensions contributed → done loading.
  const loaded =
    !hasExtensions ||
    (resolved &&
      resolvedExtensions.every((extension) => connectedResourceData[extension.uid]?.loaded));

  const getConnectedResourceLabels = React.useCallback(
    (pvc: PersistentVolumeClaimKind): ConnectedResourceLabel[] =>
      resolvedExtensions.flatMap((extension) => {
        const entry = connectedResourceData[extension.uid];
        return entry ? extension.properties.getConnectedResources(pvc, entry.data) : [];
      }),
    [resolvedExtensions, connectedResourceData],
  );

  const hookNotifications = resolvedExtensions.map((extension) => (
    <HookNotify
      key={extension.uid}
      useHook={extension.properties.useConnectedResources}
      args={[project]}
      onNotify={(value) =>
        setConnectedResourceData((prev) => ({ ...prev, [extension.uid]: value }))
      }
      onUnmount={() =>
        setConnectedResourceData((prev) => ({ ...prev, [extension.uid]: undefined }))
      }
    />
  ));

  return { hasExtensions, loaded, getConnectedResourceLabels, hookNotifications };
};
