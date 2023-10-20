import { SortableData } from '~/components/table';
import { BYONImagePackage } from '~/types';
import { DisplayedContentTab } from './ManageBYONImageModal';

export const getColumns = (tab: DisplayedContentTab): SortableData<BYONImagePackage>[] => [
  {
    field: tab === DisplayedContentTab.SOFTWARE ? 'software' : 'packages',
    label: tab === DisplayedContentTab.SOFTWARE ? 'Software' : 'Packages',
    sortable: false,
  },
  {
    field: 'version',
    label: 'Version',
    sortable: false,
  },
];
