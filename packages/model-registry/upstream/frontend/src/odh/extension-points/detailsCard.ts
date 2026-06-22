import type { Extension } from '@openshift/dynamic-plugin-sdk';
import type { ComponentCodeRef } from '@odh-dashboard/plugin-core';
import {
  createExtensionGuard,
  type DetailCardProperties,
} from '@odh-dashboard/plugin-core/extension-points';

export type ModelDetailsDeploymentCardExtension = Extension<
  'model-registry.model-details/details-card',
  Omit<DetailCardProperties, 'component'> & {
    component: ComponentCodeRef<{ rmId?: string; mrName?: string }>;
  }
>;

export const isModelDetailsDeploymentCardExtension =
  createExtensionGuard<ModelDetailsDeploymentCardExtension>(
    'model-registry.model-details/details-card',
  );
