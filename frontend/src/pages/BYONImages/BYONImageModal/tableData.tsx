import { ThProps } from '@patternfly/react-table';
import { DisplayedContentTab } from './ManageBYONImageModal';

export const getColumns = (tab: DisplayedContentTab): ThProps[] => [
  {
    label: tab === DisplayedContentTab.SOFTWARE ? 'Software' : 'Packages',
    width: 45,
  },
  {
    label: 'Version',
    width: 45,
  },
];
