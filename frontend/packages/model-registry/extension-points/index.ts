import type { Extension } from '@openshift/dynamic-plugin-sdk';
import type { ComponentCodeRef } from '@odh-dashboard/plugin-core/extension-points';
import type { ModelVersionRegisteredDeploymentsViewProps } from '../upstream/frontend/src/app/pages/modelRegistry/screens/ModelVersionDetails/types';

export type ModelRegistryDeploymentsTabExtension = Extension<
  'model-registry.version-details/tab',
  {
    id: string;
    title: string;
    component: ComponentCodeRef<ModelVersionRegisteredDeploymentsViewProps>;
  }
>;

export const isModelRegistryDeploymentsTabExtension = (
  extension: Extension,
): extension is ModelRegistryDeploymentsTabExtension =>
  extension.type === 'model-registry.version-details/tab';
