import * as React from 'react';
import { HookNotify, useExtensions, useResolvedExtensions } from '@odh-dashboard/plugin-core';
import type {
  ConnectedResourceLabel,
  ConnectionsConnectedResources,
  ConnectionsConnectedResourcesExtension,
} from '@odh-dashboard/plugin-core/extension-points';
import { isConnectionsConnectedResourcesExtension } from '@odh-dashboard/plugin-core/extension-points';
import type { Connection, PersistentVolumeClaimKind, ProjectKind } from '@odh-dashboard/k8s-core';

export const useGetConnectedResources = (
  project: ProjectKind,
): {
  hasExtensions: boolean;
  loaded: boolean;
  getConnectedResourceLabels: (
    resource: Connection | PersistentVolumeClaimKind,
  ) => ConnectedResourceLabel[];
  hookNotifications: React.ReactNode;
} => {
  const extensions = useExtensions(isConnectionsConnectedResourcesExtension);
  const [resolvedExtensions, resolved] =
    useResolvedExtensions<ConnectionsConnectedResourcesExtension>(
      isConnectionsConnectedResourcesExtension,
    );
  const [connectedResourceData, setConnectedResourceData] = React.useState<
    Record<string, ConnectionsConnectedResources | undefined>
  >({});

  const hasExtensions = extensions.length > 0;

  // Shortcut: no extensions contributed → done loading.
  const loaded =
    !hasExtensions ||
    (resolved &&
      resolvedExtensions.every((extension) => connectedResourceData[extension.uid]?.loaded));

  const getConnectedResourceLabels = React.useCallback(
    (resource: Connection | PersistentVolumeClaimKind): ConnectedResourceLabel[] =>
      resolvedExtensions.flatMap((extension) => {
        const entry = connectedResourceData[extension.uid];
        return entry ? extension.properties.getConnectedResources(resource, entry.data) : [];
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
