import type { Extension } from '@openshift/dynamic-plugin-sdk';
import type { ComponentCodeRef } from '@odh-dashboard/plugin-core';
import type { RegisteredModel } from '../../app/types';

export type ModelRegistryTableColumnExtension = Extension<
  'model-registry.registered-models/table-column',
  {
    column: ComponentCodeRef<{ registeredModel: RegisteredModel }>;
  }
>;

export const isModelRegistryTableColumnExtension: (
  extension: Extension,
) => extension is ModelRegistryTableColumnExtension;
