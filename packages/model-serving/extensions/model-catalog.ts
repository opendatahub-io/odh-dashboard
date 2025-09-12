// eslint-disable-next-line no-restricted-syntax
import { SupportedArea } from '@odh-dashboard/internal/concepts/areas/types';
import type { Extension, CodeRef } from '@openshift/dynamic-plugin-sdk';
import type { ModelDeployPrefillInfo } from '@odh-dashboard/internal/pages/modelServing/screens/projects/usePrefillModelDeployModal';

type ModelCatalogDeployModalExtension = Extension<
  'model-catalog.model-details/deploy-modal',
  {
    useAvailablePlatformIds: CodeRef<() => string[]>;
    modalComponent: CodeRef<
      React.ComponentType<{
        modelDeployPrefill: {
          data: ModelDeployPrefillInfo;
          loaded: boolean;
          error: Error | undefined;
        };
        onSubmit: () => void;
        onClose: () => void;
      }>
    >;
  }
>;

const extensions: ModelCatalogDeployModalExtension[] = [
  {
    type: 'model-catalog.model-details/deploy-modal',
    properties: {
      useAvailablePlatformIds: () =>
        import('../modelRegistry/useAvailablePlatformIds').then((m) => m.default),
      modalComponent: () =>
        import('../modelRegistry/DeployRegisteredVersionModal').then(
          (m) => m.DeployRegisteredVersionModal,
        ),
    },
    flags: {
      required: [SupportedArea.MODEL_SERVING],
    },
  },
];

export default extensions;
