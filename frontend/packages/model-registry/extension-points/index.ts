import type { Extension } from '@openshift/dynamic-plugin-sdk';
import type ModelVersionDetailsTabs from '../upstream/frontend/src/app/pages/modelRegistry/screens/ModelVersionDetails/ModelVersionDetailsTabs';
import type { ComponentCodeRef } from '../../plugin-core/src/extension-points/types';

export type ModelVersionRegisteredDeploymentsViewProps = Pick<
  React.ComponentProps<typeof ModelVersionDetailsTabs>,
  'inferenceServices' | 'servingRuntimes' | 'refresh'
>;

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
