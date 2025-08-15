import type { Extension, CodeRef } from '@openshift/dynamic-plugin-sdk';

export type ModelRegistryVersionDetailsTabExtension = Extension<
  'model-registry.version-details/tab',
  {
    id: string;
    title: string;
    component: CodeRef<React.ComponentType<{ rmId: string; mvId: string }>>;
  }
>;

export const isModelRegistryVersionDetailsTabExtension = (
  extension: Extension,
): extension is ModelRegistryVersionDetailsTabExtension =>
  extension.type === 'model-registry.version-details/tab';
