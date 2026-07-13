import { SortableData } from '@odh-dashboard/ui-core';
import { ExternalModel } from '~/app/types/external-models';
import { normalizePhase } from '~/app/utilities/phaseLabelUtils';

export const externalModelsColumns: SortableData<ExternalModel>[] = [
  {
    label: 'Model',
    field: 'model',
    sortable: (a: ExternalModel, b: ExternalModel): number =>
      (a.displayName ?? a.name).localeCompare(b.displayName ?? b.name),
  },
  {
    label: 'External provider',
    field: 'externalProvider',
    width: 15,
    sortable: (a: ExternalModel, b: ExternalModel): number =>
      a.providerRefs.length - b.providerRefs.length,
  },
  {
    label: 'Status',
    field: 'phase',
    width: 15,
    sortable: (a: ExternalModel, b: ExternalModel): number =>
      normalizePhase(a.phase).localeCompare(normalizePhase(b.phase)),
  },
];
