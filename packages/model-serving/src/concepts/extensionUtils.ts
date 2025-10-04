import React from 'react';
import { useResolvedExtensions, useExtensions } from '@odh-dashboard/plugin-core';
import { Extension, ExtensionPredicate, ResolvedExtension } from '@openshift/dynamic-plugin-sdk';
import { ModelServingPlatform } from './useProjectServingPlatform';
import type { DeploymentWizardField } from '../components/deploymentWizard/types';
import { isDeploymentWizardFieldExtension, type Deployment } from '../../extension-points';

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

export const useResolvedDeploymentExtension = <T extends PlatformExtension>(
  extensionPredicate: ExtensionPredicate<T>,
  deployment?: Deployment | null,
): [ResolvedExtension<T> | null, boolean, Error[]] => {
  const [resolvedExtensions, loaded, errors] = useResolvedExtensions<T>(extensionPredicate);

  return React.useMemo(
    () => [
      resolvedExtensions.find(
        (ext) => ext.properties.platform === deployment?.modelServingPlatformId,
      ) ?? null,
      loaded,
      errors.map((error) => (error instanceof Error ? error : new Error(String(error)))),
    ],
    [resolvedExtensions, deployment?.modelServingPlatformId, loaded, errors],
  );
};

// for deployment wizard

export const useWizardFieldsFromExtensions = (): [DeploymentWizardField[], boolean, Error[]] => {
  const [extensions, loaded, errors] = useResolvedExtensions(isDeploymentWizardFieldExtension);
  const fields = React.useMemo(() => {
    return extensions.map((ext) => ext.properties.field);
  }, [extensions]);

  return React.useMemo(
    () => [
      fields,
      loaded,
      errors.map((error) => (error instanceof Error ? error : new Error(String(error)))),
    ],
    [fields, loaded, errors],
  );
};
