import type { Extension } from '@openshift/dynamic-plugin-sdk';
import type { ComponentCodeRef } from '@odh-dashboard/plugin-core';
import {
  createExtensionGuard,
  type DetailTabProperties,
} from '@odh-dashboard/plugin-core/extension-points';

export type ModelRegistryVersionDetailsTabExtension = Extension<
  'model-registry.version-details/tab',
  Omit<DetailTabProperties, 'component'> & {
    component: ComponentCodeRef<{ rmId?: string; mvId?: string; mrName?: string }>;
  }
>;

export const isModelRegistryVersionDetailsTabExtension =
  createExtensionGuard<ModelRegistryVersionDetailsTabExtension>(
    'model-registry.version-details/tab',
  );

export type ModelRegistryDetailsTabExtension = Extension<
  'model-registry.details/tab',
  Omit<DetailTabProperties, 'component'> & {
    component: ComponentCodeRef<{ rmId?: string; mrName?: string }>;
  }
>;

export const isModelRegistryDetailsTabExtension =
  createExtensionGuard<ModelRegistryDetailsTabExtension>('model-registry.details/tab');
