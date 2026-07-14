import { SortableData } from '@odh-dashboard/ui-core';
import { ConnectedWorkbenchTableRow } from '../../types/connectedWorkbenches';

export const CONNECTED_WORKBENCH_PERMISSION_LABEL_THRESHOLD = 4;

export const PERMISSION_OPTIONS = [
  'Create',
  'Describe',
  'Update',
  'Delete',
  'Read',
  'Read_online',
  'Read_offline',
  'Write',
  'Write_online',
  'Write_offline',
] as const;

export const NO_CONNECTED_WORKBENCH_TOOLTIP =
  'Create or edit a workbench in this project to connect it to this feature store.';

export const getConnectedWorkbenchColumns = (
  featureStoreName?: string,
): SortableData<ConnectedWorkbenchTableRow>[] => {
  const featureStoreLabel = featureStoreName || 'selected';

  return [
    {
      field: 'workbenchName',
      label: 'Workbench',
      width: 25,
      sortable: (a: ConnectedWorkbenchTableRow, b: ConnectedWorkbenchTableRow): number =>
        (a.workbenchName ?? '').localeCompare(b.workbenchName ?? ''),
    },
    {
      field: 'authorizedProject',
      label: 'Authorized project',
      width: 25,
      sortable: (a: ConnectedWorkbenchTableRow, b: ConnectedWorkbenchTableRow): number =>
        a.authorizedProject.localeCompare(b.authorizedProject),
      info: {
        popover: `Authorized projects have permission to access the ${featureStoreLabel} feature store.`,
      },
    },
    {
      field: 'permissionLevel',
      label: 'Permissions',
      width: 25,
      sortable: false,
      info: {
        popover: `The permissions this project has to the ${featureStoreLabel} feature store.`,
      },
    },
  ];
};
