import type { Extension, CodeRef } from '@openshift/dynamic-plugin-sdk';
import type { ModelDeployPrefillInfo } from '~/odh/hooks/useRegisteredModelDeployPrefillInfo';

export type ModelRegistryDeployModalExtension = Extension<
  'model-registry.model-version/deploy-modal',
  {
    useDeployButtonState: CodeRef<() => { visible: boolean; enabled?: boolean; tooltip?: string }>;
    modalComponent: CodeRef<
      React.ComponentType<{
        data: {
          modelDeployPrefillInfo: ModelDeployPrefillInfo;
          loaded: boolean;
          error: Error | undefined;
          onSubmit: () => void;
        };
        onClose: () => void;
      }>
    >;
  }
>;

export const isModelRegistryDeployModalExtension = (
  extension: Extension,
): extension is ModelRegistryDeployModalExtension =>
  extension.type === 'model-registry.model-version/deploy-modal';
