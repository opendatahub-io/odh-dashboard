import type { Extension } from '@openshift/dynamic-plugin-sdk';
import {
  createExtensionGuard,
  type TableColumnProperties,
} from '@odh-dashboard/plugin-core/extension-points';

export type ModelRegistryTableColumnExtension = Extension<
  'model-registry.registered-models/table-column',
  TableColumnProperties
>;

export const isModelRegistryTableColumnExtension =
  createExtensionGuard<ModelRegistryTableColumnExtension>(
    'model-registry.registered-models/table-column',
  );
