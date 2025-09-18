import type { CodeRef, Extension } from '@openshift/dynamic-plugin-sdk';

export type ModelDetailsDeploymentCardExtension = Extension<
  'model-registry.model-details/details-card',
  {
    component: CodeRef<React.ComponentType<{ rmId?: string; mrName?: string }>>;
  }
>;

export const isModelDetailsDeploymentCardExtension = (
  extension: Extension,
): extension is ModelDetailsDeploymentCardExtension =>
  extension.type === 'model-registry.model-details/details-card';
