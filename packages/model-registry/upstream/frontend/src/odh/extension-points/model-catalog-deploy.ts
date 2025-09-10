import type { Extension, CodeRef } from '@openshift/dynamic-plugin-sdk';
import type { ComponentCodeRef } from '@odh-dashboard/plugin-core';
import type { ModelDeployPrefillInfo } from '~/odh/hooks/useRegisteredModelDeployPrefillInfo';

export type ModelCatalogDeployModalExtension = Extension<
  'model-catalog.model-details/deploy-modal',
  {
    useAvailablePlatformIds: CodeRef<() => string[]>;
    modalComponent: ComponentCodeRef<{
      modelDeployPrefill: {
        data: ModelDeployPrefillInfo;
        loaded: boolean;
        error: Error | undefined;
      };
      onSubmit: () => void;
      onClose: () => void;
    }>;
  }
>;

export const isModelCatalogDeployModalExtension = (
  extension: Extension,
): extension is ModelCatalogDeployModalExtension =>
  extension.type === 'model-catalog.model-details/deploy-modal';
