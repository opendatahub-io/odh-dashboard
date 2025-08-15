import type { Extension, CodeRef } from '@openshift/dynamic-plugin-sdk';
export type ModelRegistryVersionDetailsTabExtension = Extension<'model-registry.version-details/tab', {
    id: string;
    title: string;
    component: CodeRef<React.ComponentType<{
        rmId?: string;
        mvId?: string;
    }>>;
}>;
export declare const isModelRegistryVersionDetailsTabExtension: (extension: Extension) => extension is ModelRegistryVersionDetailsTabExtension;
