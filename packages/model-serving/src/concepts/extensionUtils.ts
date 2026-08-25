import React from 'react';
import { useResolvedExtensions, useExtensions } from '@odh-dashboard/plugin-core';
import {
  AnyObject,
  Extension,
  ExtensionPredicate,
  ResolvedExtension,
} from '@openshift/dynamic-plugin-sdk';
import { ModelServingPlatform } from './useProjectServingPlatform';
import { type Deployment } from '../../extension-points';

export type PlatformExtension = Extension & { properties: { platform: string } };

export const usePlatformExtension = <T extends PlatformExtension>(
  extensionPredicate: ExtensionPredicate<T>,
  platform: ModelServingPlatform,
): T | null => {
  const extensions = useExtensions<T>(extensionPredicate);

  return React.useMemo(
    () => extensions.find((ext) => ext.properties.platform === platform.properties.id) ?? null,
    [extensions, platform],
  );
};

export const useResolvedPlatformExtension = <T extends PlatformExtension>(
  extensionPredicate: ExtensionPredicate<T>,
  platform: ModelServingPlatform,
): [ResolvedExtension<T> | null, boolean, unknown[]] => {
  const [resolvedExtensions, loaded, errors] = useResolvedExtensions<T>(extensionPredicate);

  return React.useMemo(
    () => [
      resolvedExtensions.find((ext) => ext.properties.platform === platform.properties.id) ?? null,
      loaded,
      errors,
    ],
    [resolvedExtensions, platform, loaded, errors],
  );
};

/////

export const useDeploymentExtension = <T extends PlatformExtension>(
  extensionPredicate: ExtensionPredicate<T>,
  deployment?: Deployment,
): T | null => {
  const extensions = useExtensions<T>(extensionPredicate);

  return React.useMemo(
    () =>
      extensions.find((ext) => ext.properties.platform === deployment?.modelServingPlatformId) ??
      null,
    [extensions, deployment],
  );
};

const getExtensionPriority = (properties: AnyObject): number =>
  typeof properties.priority === 'number' ? properties.priority : 0;

const isExtensionActiveForDeployment = (
  properties: AnyObject,
  deployment?: Deployment | null,
): boolean => {
  const { isActive } = properties;
  if (typeof isActive === 'function') {
    return !!deployment && isActive(deployment) === true;
  }
  // Absent or `true` means active; only an explicit `false` disables.
  return isActive !== false;
};

// Selects the extension for a deployment's platform. When several extensions share a platform,
// only those whose optional `isActive(deployment)` passes are eligible, and the highest `priority`
// wins. Extensions without isActive/priority (auth, delete, fetch-status) behave as before.
export const useResolvedDeploymentExtension = <T extends PlatformExtension>(
  extensionPredicate: ExtensionPredicate<T>,
  deployment?: Deployment | null,
): [ResolvedExtension<T> | null, boolean, Error[]] => {
  const [resolvedExtensions, loaded, errors] = useResolvedExtensions<T>(extensionPredicate);

  return React.useMemo(
    () => [
      resolvedExtensions
        .filter((ext) => ext.properties.platform === deployment?.modelServingPlatformId)
        .filter((ext) => isExtensionActiveForDeployment(ext.properties, deployment))
        .toSorted(
          (a, b) => getExtensionPriority(b.properties) - getExtensionPriority(a.properties),
        )[0] ?? null,
      loaded,
      errors.map((error) => (error instanceof Error ? error : new Error(String(error)))),
    ],
    [resolvedExtensions, deployment, loaded, errors],
  );
};
