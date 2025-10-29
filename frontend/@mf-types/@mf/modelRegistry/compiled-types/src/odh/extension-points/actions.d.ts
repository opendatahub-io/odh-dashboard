import type { Extension, CodeRef } from '@openshift/dynamic-plugin-sdk';
import type { ModelVersion, RegisteredModel } from '~/app/types';
type ModelVersionActionBaseProps = {
    mv: ModelVersion;
    registeredModel?: RegisteredModel;
    onActionComplete?: () => void;
};
export type ModelVersionKebabActionExtension = Extension<'model-registry.model-version/kebab-action', {
    id: string;
    title: string;
    component: CodeRef<React.ComponentType<ModelVersionActionBaseProps>>;
}>;
export declare const isModelVersionKebabActionExtension: (extension: Extension) => extension is ModelVersionKebabActionExtension;
export type ModelVersionHeaderActionExtension = Extension<'model-registry.model-version/header-action', {
    id: string;
    title: string;
    component: CodeRef<React.ComponentType<ModelVersionActionBaseProps>>;
}>;
export declare const isModelVersionHeaderActionExtension: (extension: Extension) => extension is ModelVersionHeaderActionExtension;
export {};
