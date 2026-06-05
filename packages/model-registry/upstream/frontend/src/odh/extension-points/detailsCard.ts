import type { Extension } from '@openshift/dynamic-plugin-sdk';
import {
  createExtensionGuard,
  type DetailCardProperties,
} from '@odh-dashboard/plugin-core/extension-points';

export type ModelDetailsDeploymentCardExtension = Extension<
  'model-registry.model-details/details-card',
  DetailCardProperties
>;

export const isModelDetailsDeploymentCardExtension =
  createExtensionGuard<ModelDetailsDeploymentCardExtension>(
    'model-registry.model-details/details-card',
  );
