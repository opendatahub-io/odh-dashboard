// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- shared table types from ui-core
import type { SortableData } from '@odh-dashboard/ui-core';
import type { KueueProject } from '../types';

export const KUEUE_PROJECTS_MODAL_TITLE = 'Kueue projects';

export const KUEUE_PROJECTS_MODAL_DESCRIPTION = 'Kueue projects using this cluster queue.';

export const KUEUE_MANAGED_STATUS_LABEL = 'Kueue-managed';

export const compareKueueProjectsByName = (a: KueueProject, b: KueueProject): number =>
  a.name.localeCompare(b.name);

export const kueueProjectsColumns: SortableData<KueueProject>[] = [
  {
    label: 'Name',
    field: 'name',
    width: 50,
    sortable: compareKueueProjectsByName,
  },
  {
    label: 'Status',
    field: 'status',
    width: 50,
    sortable: false,
  },
];
