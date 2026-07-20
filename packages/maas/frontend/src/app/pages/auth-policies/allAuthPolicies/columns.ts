import { SortableData } from '@odh-dashboard/ui-core';
import { MaaSAuthPolicy } from '~/app/types/subscriptions';
import { normalizePhase } from '~/app/utilities/phaseLabelUtils';

export const authPoliciesColumns: SortableData<MaaSAuthPolicy>[] = [
  {
    label: 'Name',
    field: 'name',
    sortable: (a: MaaSAuthPolicy, b: MaaSAuthPolicy): number =>
      (a.displayName ?? a.name).localeCompare(b.displayName ?? b.name),
  },
  {
    label: 'Status',
    field: 'phase',
    width: 10,
    sortable: (a: MaaSAuthPolicy, b: MaaSAuthPolicy): number =>
      normalizePhase(a.phase).localeCompare(normalizePhase(b.phase)),
  },
  {
    label: 'Groups',
    field: 'subjects.groups',
    sortable: (a: MaaSAuthPolicy, b: MaaSAuthPolicy): number =>
      (a.subjects.groups?.length ?? 0) - (b.subjects.groups?.length ?? 0),
  },
  {
    label: 'Models',
    field: 'modelRefs',
    sortable: (a: MaaSAuthPolicy, b: MaaSAuthPolicy): number =>
      a.modelRefs.length - b.modelRefs.length,
  },
];
