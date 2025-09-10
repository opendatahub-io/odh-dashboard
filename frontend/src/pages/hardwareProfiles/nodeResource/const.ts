import { SortableData } from '#~/components/table';
import { Identifier } from '#~/types';

export const HARDWARE_PROFILE_COLUMN_HELP_TOOLTIP = {
  minCount: 'The minimum number of resources that users can define for requests.',
  maxCount: 'The maximum resources that users can request.',
  defaultCount: 'The default request and limit presented to the user.',
  resourceName: 'The resource name is the display name shown for this resource in the dashboard.',
  resourceIdentifier:
    'The resource identifier is the key that matches how this resource is defined on the cluster.',
  resourceType:
    'The resource type defines the category of this resource, such as CPU, Memory, Accelerator, and other.',
};

export const nodeResourceColumns: SortableData<Identifier>[] = [
  {
    field: 'resourceName',
    label: 'Resource name',
    sortable: false,
    info: {
      popover: HARDWARE_PROFILE_COLUMN_HELP_TOOLTIP.resourceName,
    },
  },
  {
    field: 'identifier',
    label: 'Resource identifier',
    sortable: false,
    info: {
      popover: HARDWARE_PROFILE_COLUMN_HELP_TOOLTIP.resourceIdentifier,
    },
  },
  {
    field: 'resourceType',
    label: 'Resource type',
    sortable: false,
    info: {
      popover: HARDWARE_PROFILE_COLUMN_HELP_TOOLTIP.resourceType,
    },
  },
  {
    field: 'defaultCount',
    label: 'Default',
    sortable: false,
    info: {
      popover: HARDWARE_PROFILE_COLUMN_HELP_TOOLTIP.defaultCount,
    },
  },
  {
    field: 'minCount',
    label: 'Minimum allowed',
    sortable: false,
    info: {
      popover: HARDWARE_PROFILE_COLUMN_HELP_TOOLTIP.minCount,
      popoverProps: {
        showClose: false,
      },
    },
  },
  {
    field: 'maxCount',
    label: 'Maximum allowed',
    sortable: false,
    info: {
      popover: HARDWARE_PROFILE_COLUMN_HELP_TOOLTIP.maxCount,
      popoverProps: {
        showClose: false,
      },
    },
  },
  {
    field: 'kebab',
    label: '',
    sortable: false,
  },
];

export const EMPTY_IDENTIFIER: Identifier = {
  displayName: '',
  identifier: '',
  minCount: 1,
  maxCount: 1,
  defaultCount: 1,
};

export const DEFAULT_CPU_SIZE = {
  minCount: 1,
  maxCount: 4,
  defaultCount: 2,
};

export const DEFAULT_ACCELERATOR_SIZE = {
  minCount: 1,
  maxCount: 2,
  defaultCount: 1,
};

export const DEFAULT_MEMORY_SIZE = {
  minCount: '2Gi',
  maxCount: '8Gi',
  defaultCount: '4Gi',
};

export const DEFAULT_CPU_IDENTIFIER = 'cpu';
export const DEFAULT_MEMORY_IDENTIFIER = 'memory';

export const DEFAULT_PRIORITY_CLASS = 'None';

export const HARDWARE_PROFILE_RESOURCE_ALLOCATION_HELP = {
  localQueue:
    'Local queue is an entry point for users to submit their workloads for shared resource management provided by Kueue.',
  workloadPriority:
    "The workload priority determines how the workload is handled within Kueue's resource management system. For example, you might assign production workloads a higher priority than development workloads.",
  nodeSelectors:
    'Node selectors are added to a pod spec to allow the pod to be scheduled on nodes with matching labels.',
  tolerations:
    'Tolerations are applied to pods and allow the scheduler to schedule pods on nodes with matching taints.',
};
