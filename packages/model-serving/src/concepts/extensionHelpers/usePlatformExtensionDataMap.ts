import React from 'react';
import { useExtensions } from '@odh-dashboard/plugin-core';
import type { ExtensionPredicate, LoadedExtension } from '@openshift/dynamic-plugin-sdk';
import type { PlatformExtension } from '../extensionUtils';
import { Deployment } from '../../../extension-points';

export type ExtensionDataEntry<TExtension extends PlatformExtension> = {
  data: unknown;
  extension: LoadedExtension<TExtension>;
};

export type ExtensionDataMap<TExtension extends PlatformExtension> = Record<
  string,
  ExtensionDataEntry<TExtension>
>;

type UsePlatformExtensionDataMapResult<TExtension extends PlatformExtension> = {
  extensionDataMap: ExtensionDataMap<TExtension>;
  onLoad: (platformId: string, data: unknown) => void;
};

/**
 * Generic hook for managing per-platform extension data.
 *
 * Resolves extensions by platform ID from the active set of platform IDs,
 * manages the loaded data per platform, and returns a combined map of
 * extension + data keyed by platform ID.
 *
 * The raw (unresolved) extension is stored so that CodeRef-based properties
 * like ServingDetailsComponent remain usable with LazyCodeRefComponent.
 * Use PlatformExtensionDataLoader to call the resolved dataHook per platform.
 */
export const usePlatformExtensionDataMap = <TExtension extends PlatformExtension>(
  predicate: ExtensionPredicate<TExtension>,
  deployments?: Deployment[],
): UsePlatformExtensionDataMapResult<TExtension> => {
  const platformIds: string[] = React.useMemo(
    () => (deployments ? [...new Set(deployments.map((d) => d.modelServingPlatformId))] : []),
    [deployments],
  );
  const extensions = useExtensions(predicate);
  const [platformData, setPlatformData] = React.useState<Record<string, unknown>>({});

  const onLoad = React.useCallback((platformId: string, data: unknown) => {
    setPlatformData((prev) => {
      if (data === undefined) {
        const next = { ...prev };
        delete next[platformId];
        return next;
      }
      if (prev[platformId] === data) {
        return prev;
      }
      return { ...prev, [platformId]: data };
    });
  }, []);

  const extensionDataMap = React.useMemo<ExtensionDataMap<TExtension>>(
    () =>
      platformIds.reduce<ExtensionDataMap<TExtension>>((acc, platformId) => {
        const extension = extensions.find((ext) => ext.properties.platform === platformId);
        if (!extension) {
          return acc;
        }
        return { ...acc, [platformId]: { data: platformData[platformId], extension } };
      }, {}),
    [platformIds, extensions, platformData],
  );

  return { extensionDataMap, onLoad };
};
