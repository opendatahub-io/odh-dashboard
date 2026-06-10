import { SortableData } from '@odh-dashboard/internal/components/table/types';
import { ConnectedWorkbenchTableRow } from '../../types/connectedWorkbenches';

export const CONNECTED_WORKBENCH_PERMISSION_LABEL_THRESHOLD = 4;

export const NO_CONNECTED_WORKBENCH_TOOLTIP =
  'Go to the Authorized project page, edit a workbench or create a new one to connect with desired feature stores.';

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
        popover: 'Projects that have permission to access the selected feature store.',
      },
    },
    {
      field: 'permissionLevel',
      label: 'Permission',
      width: 25,
      sortable: false,
      info: {
        popover: `Your access permission to ${featureStoreLabel} feature store.`,
      },
    },
  ];
};
