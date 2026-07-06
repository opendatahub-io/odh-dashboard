import React from 'react';
import { HookNotify, useExtensions, useResolvedExtensions } from '@odh-dashboard/plugin-core';
import type {
  ExtensionPredicate,
  LoadedExtension,
  ResolvedExtension,
} from '@openshift/dynamic-plugin-sdk';
import type { PlatformExtension } from '../extensionUtils';

type DataHook = () => unknown;

type PlatformExtensionDataLoaderProps<TExtension extends PlatformExtension> = {
  /** Predicate used to resolve extensions for this platform type. */
  predicate: ExtensionPredicate<TExtension>;
  /** Active platform IDs to render hooks for (typically Object.keys of an extensionDataMap). */
  platformIds: string[];
  onLoad: (platformId: string, data: unknown) => void;
  /**
   * Extracts the data hook from a resolved extension.
   * Provided by the caller so the type-safe CodeRef access happens against the
   * concrete resolved type, not the generic ResolvedExtension<TExtension>.
   */
  getDataHook: (
    resolvedExt: LoadedExtension<ResolvedExtension<TExtension>>,
  ) => DataHook | undefined;
};

export const isDataHook = (value: unknown): value is () => unknown => typeof value === 'function';

/**
 * Generic component that renders one HookNotify per active platform whose resolved
 * extension provides a data hook. This is O(N platforms), not O(N items in the list).
 * Renders nothing visible — only side-effects via onLoad callbacks.
 */
export function PlatformExtensionDataLoader<TExtension extends PlatformExtension>({
  predicate,
  platformIds,
  onLoad,
  getDataHook,
}: PlatformExtensionDataLoaderProps<TExtension>): React.ReactElement | null {
  const rawExtensions = useExtensions(predicate);
  const [resolvedExtensions] = useResolvedExtensions(predicate);

  return (
    <>
      {platformIds.map((platformId) => {
        const rawExt = rawExtensions.find((ext) => ext.properties.platform === platformId);
        if (!rawExt) {
          return null;
        }
        const resolvedExt = resolvedExtensions.find((ext) => ext.uid === rawExt.uid);
        if (!resolvedExt) {
          return null;
        }
        const dataHook = getDataHook(resolvedExt);
        if (!dataHook) {
          return null;
        }
        return (
          <PlatformHookNotify
            key={platformId}
            platformId={platformId}
            dataHook={dataHook}
            onLoad={onLoad}
          />
        );
      })}
    </>
  );
}

type PlatformHookNotifyProps = {
  platformId: string;
  dataHook: DataHook;
  onLoad: (platformId: string, data: unknown) => void;
};

const PlatformHookNotify: React.FC<PlatformHookNotifyProps> = ({
  platformId,
  dataHook,
  onLoad,
}) => {
  const onNotify = React.useCallback(
    (data: unknown) => {
      onLoad(platformId, data);
    },
    [platformId, onLoad],
  );

  const onUnmount = React.useCallback(() => {
    onLoad(platformId, undefined);
  }, [platformId, onLoad]);

  return <HookNotify useHook={dataHook} onNotify={onNotify} onUnmount={onUnmount} />;
};
