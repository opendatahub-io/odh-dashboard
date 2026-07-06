import { ThProps } from '@patternfly/react-table';

export const columns: ThProps[] = [
  { label: 'Section heading / field name', width: 30 },
  { label: 'Environment variable', width: 25 },
  { label: 'Type', width: 10 },
  { label: 'Default value', width: 25, visibility: ['hiddenOnMd', 'visibleOnLg'] },
  { label: 'Required', width: 10, visibility: ['hiddenOnMd', 'visibleOnXl'] },
];
