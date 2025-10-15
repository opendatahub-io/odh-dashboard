import React from 'react';
import { SortableData } from '#~/components/table';
import { HardwareProfileKind } from '#~/k8sTypes';
import {
  HardwareProfileFormData,
  ManageHardwareProfileSectionID,
  ManageHardwareProfileSectionTitlesType,
} from '#~/pages/hardwareProfiles/manage/types';
import { IdentifierResourceType } from '#~/types';

export const hardwareProfileColumns: SortableData<HardwareProfileKind>[] = [
  {
    field: 'expand',
    label: '',
    sortable: false,
  },
  {
    field: 'drag-drop-handle',
    label: '',
    sortable: false,
  },
  {
    field: 'name',
    label: 'Name',
    sortable: false,
    width: 25,
  },
  {
    field: 'visibility',
    label: 'Visibility',
    sortable: false,
    info: {
      popover: (
        <>
          Visible features indicate where the hardware profile can be used: in <b>workbenches</b>{' '}
          and during <b>model deployment</b>.
        </>
      ),
      popoverProps: {
        showClose: false,
      },
    },
    width: 20,
  },
  {
    field: 'enablement',
    label: 'Enabled',
    sortable: false,
    info: {
      popover: 'Indicates whether the hardware profile is available for new resources.',
      popoverProps: {
        showClose: false,
      },
    },
    width: 15,
  },
  {
    field: 'last_modified',
    label: 'Last modified',
    sortable: false,
    width: 20,
  },
  {
    field: 'kebab',
    label: '',
    sortable: false,
  },
];

export enum HardwareProfileEnableType {
  enabled = 'Enabled',
  disabled = 'Disabled',
}

export enum HardwareProfileFilterOptions {
  name = 'Name',
  enabled = 'Enabled',
  visibility = 'Visibility',
}

export const hardwareProfileFilterOptions = {
  [HardwareProfileFilterOptions.name]: 'Name',
  [HardwareProfileFilterOptions.enabled]: 'Enabled',
  [HardwareProfileFilterOptions.visibility]: 'Visibility',
};

export type HardwareProfileFilterDataType = Record<
  HardwareProfileFilterOptions,
  string | undefined
>;

export const initialHardwareProfileFilterData: HardwareProfileFilterDataType = {
  [HardwareProfileFilterOptions.name]: '',
  [HardwareProfileFilterOptions.enabled]: undefined,
  [HardwareProfileFilterOptions.visibility]: undefined,
};

export const ManageHardwareProfileSectionTitles: ManageHardwareProfileSectionTitlesType = {
  [ManageHardwareProfileSectionID.DETAILS]: 'Details',
  [ManageHardwareProfileSectionID.VISIBILITY]: 'Visibility',
  [ManageHardwareProfileSectionID.IDENTIFIERS]: 'Resource requests and limits',
  [ManageHardwareProfileSectionID.SCHEDULING]: 'Resource allocation',
  [ManageHardwareProfileSectionID.ALLOCATION_STRATEGY]: 'Workload allocation strategy',
  [ManageHardwareProfileSectionID.LOCAL_QUEUE]: 'Local queue',
  [ManageHardwareProfileSectionID.WORKLOAD_PRIORITY]: 'Workload priority',
  [ManageHardwareProfileSectionID.NODE_SELECTORS]: 'Node selectors',
  [ManageHardwareProfileSectionID.TOLERATIONS]: 'Tolerations',
};

export const DEFAULT_HARDWARE_PROFILE_FORM_DATA: HardwareProfileFormData = {
  name: '',
  displayName: '',
  description: '',
  visibility: [],
  enabled: true,
  identifiers: [
    {
      identifier: 'cpu',
      displayName: 'CPU',
      defaultCount: 2,
      maxCount: 4,
      minCount: 1,
      resourceType: IdentifierResourceType.CPU,
    },
    {
      identifier: 'memory',
      displayName: 'Memory',
      defaultCount: '4Gi',
      minCount: '2Gi',
      maxCount: '8Gi',
      resourceType: IdentifierResourceType.MEMORY,
    },
  ],
};

export const CPU_MEMORY_MISSING_WARNING =
  'It is not recommended to remove the last CPU or Memory resource. Resources that use this hardware profile will schedule, but will be very unstable due to not having any lower or upper resource bounds.';

export const DEFAULT_PROFILE_NAME = 'default-profile';
