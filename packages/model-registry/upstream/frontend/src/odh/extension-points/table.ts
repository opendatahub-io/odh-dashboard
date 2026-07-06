import type { Extension } from '@openshift/dynamic-plugin-sdk';
import type { ComponentCodeRef } from '@odh-dashboard/plugin-core';
import {
  createExtensionGuard,
  type TableColumnProperties,
} from '@odh-dashboard/plugin-core/extension-points';
import type { RegisteredModel } from '~/app/types';

export type ModelRegistryTableColumnExtension = Extension<
  'model-registry.registered-models/table-column',
  Omit<TableColumnProperties, 'component'> & {
    component: ComponentCodeRef<{
      registeredModel: RegisteredModel;
      preferredModelRegistryName?: string;
    }>;
  }
>;

export const isModelRegistryTableColumnExtension =
  createExtensionGuard<ModelRegistryTableColumnExtension>(
    'model-registry.registered-models/table-column',
  );
