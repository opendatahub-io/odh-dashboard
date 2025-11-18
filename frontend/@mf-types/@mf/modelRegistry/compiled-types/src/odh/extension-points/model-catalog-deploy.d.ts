import type { Extension, CodeRef } from '@openshift/dynamic-plugin-sdk';
import type { ModelDeployPrefillInfo } from '~/odh/hooks/useRegisteredModelDeployPrefillInfo';
export type ModelCatalogDeployModalExtension = Extension<'model-catalog.model-details/deploy-modal', {
    useAvailablePlatformIds: CodeRef<() => string[]>;
    modalComponent: CodeRef<React.ComponentType<{
        modelDeployPrefill: {
            data: ModelDeployPrefillInfo;
            loaded: boolean;
            error: Error | undefined;
        };
        onSubmit: () => void;
        onClose: () => void;
    }>>;
}>;
export declare const isModelCatalogDeployModalExtension: (extension: Extension) => extension is ModelCatalogDeployModalExtension;
