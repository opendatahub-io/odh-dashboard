import type { Extension, CodeRef } from '@openshift/dynamic-plugin-sdk';

export type ModelRegistryLabTuneModalExtension = Extension<
  'model-registry.model-version/lab-tune-modal',
  {
    useAvailability: CodeRef<() => { enabled: boolean; tooltip?: string }>;
    modalComponent: CodeRef<React.ComponentType<{
      modelVersion: {
        id: string;
        name: string;
        registeredModelId: string;
      };
      onSubmit: (selectedProject: string) => void;
      onClose: () => void;
      loaded?: boolean;
      loadError?: Error | null;
    }>>;
  }
>;

export const isModelRegistryLabTuneModalExtension = (
  extension: Extension,
): extension is ModelRegistryLabTuneModalExtension =>
  extension.type === 'model-registry.model-version/lab-tune-modal';
