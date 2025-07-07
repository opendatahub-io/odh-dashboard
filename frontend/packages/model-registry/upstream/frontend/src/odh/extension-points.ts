import type { Extension } from '@openshift/dynamic-plugin-sdk';
import type { ComponentCodeRef } from '@odh-dashboard/plugin-core/extension-points';
import { ModelVersion } from '~/app/types';

export type ModelRegistryDeploymentsTabExtension = Extension<
  'model-registry.version-details/tab',
  {
    id: string;
    title: string;
    component: ComponentCodeRef<{ mv: ModelVersion; refresh: () => void }>;
  }
>;

export const isModelRegistryDeploymentsTabExtension = (
  extension: Extension,
): extension is ModelRegistryDeploymentsTabExtension =>
  extension.type === 'model-registry.version-details/tab';

export type ArchiveModelVersionButtonExtension = Extension<
  'model-registry.model-version/archive-button',
  {
    id: string;
    component: ComponentCodeRef<{
      mv: ModelVersion;
      setIsArchiveModalOpen: (value: React.SetStateAction<boolean>) => void;
      ref: React.LegacyRef<HTMLButtonElement>;
    }>;
  }
>;

export const isArchiveModelVersionButtonExtension = (
  extension: Extension,
): extension is ArchiveModelVersionButtonExtension =>
  extension.type === 'model-registry.model-version/archive-button';