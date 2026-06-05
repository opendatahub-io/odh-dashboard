import type { Extension } from '@openshift/dynamic-plugin-sdk';
import {
  createExtensionGuard,
  type DetailTabProperties,
} from '@odh-dashboard/plugin-core/extension-points';

export type ModelRegistryVersionDetailsTabExtension = Extension<
  'model-registry.version-details/tab',
  DetailTabProperties
>;

export const isModelRegistryVersionDetailsTabExtension =
  createExtensionGuard<ModelRegistryVersionDetailsTabExtension>(
    'model-registry.version-details/tab',
  );

export type ModelRegistryDetailsTabExtension = Extension<
  'model-registry.details/tab',
  DetailTabProperties
>;

export const isModelRegistryDetailsTabExtension =
  createExtensionGuard<ModelRegistryDetailsTabExtension>('model-registry.details/tab');
