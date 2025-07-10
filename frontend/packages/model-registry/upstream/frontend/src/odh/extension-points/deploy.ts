import type { ModelVersion } from '~/app/types';
import type { Extension, CodeRef } from '@openshift/dynamic-plugin-sdk';
import type { IAction } from '@patternfly/react-table';

export type ModelRegistryDeployButtonExtension = Extension<
  'model-registry.model-version/deploy-button',
  {
    component: CodeRef<
      React.ComponentType<{
        modelVersion: ModelVersion;
      }>
    >;
  }
>;

export const isModelRegistryDeployButtonExtension = (
  extension: Extension,
): extension is ModelRegistryDeployButtonExtension =>
  extension.type === 'model-registry.model-version/deploy-button';

export type ModelRegistryRowActionColumnExtension = Extension<
  'model-registry.model-version/row-action-column',
  {
    component: CodeRef<
      React.ComponentType<{
        modelVersion: ModelVersion;
        actions: IAction[];
      }>
    >;
  }
>;

export const isModelRegistryRowActionColumnExtension = (
  extension: Extension,
): extension is ModelRegistryRowActionColumnExtension =>
  extension.type === 'model-registry.model-version/row-action-column';
