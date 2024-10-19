import { OffIcon, PlayIcon } from '@patternfly/react-icons';
import * as React from 'react';
import { SortableData } from '~/components/table';
import { ProjectKind } from '~/k8sTypes';
import { getProjectCreationTime } from '~/concepts/projects/utils';
import { getDisplayNameFromK8sResource } from '~/concepts/k8s/utils';

const WorkBenchDescription = (
  <div>
    <div>
      <PlayIcon className="pf-v5-u-mr-xs" />
      Indicates number of running or starting workbenches.
    </div>
    <div>
      <OffIcon className="pf-v5-u-mr-xs" />
      Indicates number of stopped workbenches.
    </div>
  </div>
);

export const columns: SortableData<ProjectKind>[] = [
  {
    field: 'name',
    label: 'Name',
    sortable: (a, b) =>
      getDisplayNameFromK8sResource(a).localeCompare(getDisplayNameFromK8sResource(b)),
    width: 30,
  },
  {
    field: 'created',
    label: 'Created',
    sortable: (a, b) => getProjectCreationTime(a) - getProjectCreationTime(b),
    width: 30,
  },
  {
    field: 'Workbenches',
    label: 'Workbenches',
    sortable: false,
    width: 30,
    info: {
      popoverProps: { headerContent: 'Workbench counts', hasAutoWidth: true },
      popover: WorkBenchDescription,
    },
  },
  {
    field: 'kebab',
    label: '',
    sortable: false,
    width: 10,
  },
];
