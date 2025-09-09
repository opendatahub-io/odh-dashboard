import type { Extension, CodeRef } from '@openshift/dynamic-plugin-sdk';

export type ModelRegistryVersionDetailsTabExtension = Extension<
  'model-registry.version-details/tab',
  {
    id: string;
    title: string;
    component: CodeRef<React.ComponentType<{ rmId?: string; mvId?: string; mrName?: string }>>;
  }
>;

export const isModelRegistryVersionDetailsTabExtension = (
  extension: Extension,
): extension is ModelRegistryVersionDetailsTabExtension =>
  extension.type === 'model-registry.version-details/tab';

export type ModelRegistryDetailsTabExtension = Extension<
  'model-registry.details/tab',
  {
    id: string;
    title: string;
    component: CodeRef<React.ComponentType<{ rmId?: string; mrName?: string }>>;
  }
>;

export const isModelRegistryDetailsTabExtension = (
  extension: Extension,
): extension is ModelRegistryDetailsTabExtension =>
  extension.type === 'model-registry.details/tab';
