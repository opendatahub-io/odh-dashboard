import type { Extension, CodeRef } from '@openshift/dynamic-plugin-sdk';

// Import the extension types from the model registry package
type ModelRegistryLabTuneModalExtension = Extension<
  'model-registry.model-version/lab-tune-modal',
  {
    useAvailability: CodeRef<() => { enabled: boolean; tooltip?: string }>;
    modalComponent: CodeRef<
      React.ComponentType<{
        modelVersion: {
          id: string;
          name: string;
          registeredModelId: string;
        };
        onSubmit: (selectedProject: string) => void;
        onClose: () => void;
        loaded?: boolean;
        loadError?: Error | null;
      }>
    >;
  }
>;

const extensions: ModelRegistryLabTuneModalExtension[] = [
  {
    type: 'model-registry.model-version/lab-tune-modal',
    // Removing feature flag requirement since mod-arch-core doesn't support ODH feature flags
    // The availability will be checked in the useLabTuneAvailability hook instead
    properties: {
      useAvailability: () =>
        import('#~/plugins/model-registry/useLabTuneAvailability').then((m) => m.default),
      modalComponent: () => import('#~/plugins/model-registry/LabTuneModal').then((m) => m.default),
    },
  },
];

export default extensions;
