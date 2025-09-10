import type { Extension, CodeRef } from '@openshift/dynamic-plugin-sdk';
import type { SortableData } from '@odh-dashboard/internal/components/table/types';
import type { RegisteredModel } from '~/app/types';

export type ModelRegistryTableColumn<RM extends RegisteredModel = RegisteredModel> = SortableData<RM> & {
  cellRenderer: (registeredModel: RM) => React.ReactNode;
};

export type ModelRegistryTableColumnExtension = Extension<
  'model-registry.registered-models/table-column',
  {
    column: CodeRef<() => ModelRegistryTableColumn<RegisteredModel>>;
  }
>;

export const isModelRegistryTableColumnExtension: (
  extension: Extension,
) => extension is ModelRegistryTableColumnExtension;
