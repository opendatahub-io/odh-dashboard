import React from 'react';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import {
  Extension,
  ExtensionPredicate,
  ResolvedExtension,
  useExtensions,
} from '@openshift/dynamic-plugin-sdk';
import { ModelServingPlatform } from './modelServingPlatforms';

export const usePlatformExtension = <T extends Extension>(
  extensionPredicate: ExtensionPredicate<T>,
  platform: ModelServingPlatform,
): T | undefined => {
  const extensions = useExtensions<T>(extensionPredicate);

  return React.useMemo(
    () => extensions.find((ext) => ext.properties.platform === platform.properties.id),
    [extensions, platform],
  );
};

export const useResolvedPlatformExtension = <T extends Extension>(
  extensionPredicate: ExtensionPredicate<T>,
  platform: ModelServingPlatform,
): [ResolvedExtension<T> | undefined | null, boolean, unknown[]] => {
  const [resolvedExtensions, loaded, errors] = useResolvedExtensions<T>(extensionPredicate);

  return React.useMemo(
    () => [
      !loaded
        ? undefined
        : resolvedExtensions.find((ext) => ext.properties.platform === platform.properties.id) ??
          null,
      loaded,
      errors,
    ],
    [resolvedExtensions, platform, loaded, errors],
  );
};
