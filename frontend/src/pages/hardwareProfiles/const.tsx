import React from 'react';
import { SortableData } from '~/components/table';
import { HardwareProfileKind } from '~/k8sTypes';
import {
  ManageHardwareProfileSectionID,
  ManageHardwareProfileSectionTitlesType,
} from '~/pages/hardwareProfiles/manage/types';
import { IdentifierResourceType } from '~/types';

export const hardwareProfileColumns: SortableData<HardwareProfileKind>[] = [
  {
    field: 'expand',
    label: '',
    sortable: false,
  },
  {
    field: 'name',
    label: 'Name',
    sortable: (a, b) => a.spec.displayName.localeCompare(b.spec.displayName),
    width: 40,
  },
  {
    field: 'source',
    label: 'Source',
    sortable: false,
    width: 20,
    info: {
      popover:
        'This is the legacy resource type that this hardware profile was created from, such as an accelerator profile.',
      popoverProps: {
        showClose: false,
      },
    },
  },
  {
    field: 'visibility',
    label: 'Visibility',
    sortable: (a: HardwareProfileKind, b: HardwareProfileKind): number => {
      try {
        const aUseCases = JSON.parse(
          a.metadata.annotations?.['opendatahub.io/dashboard-feature-visibility'] ?? '[]',
        ).toSorted();
        const bUseCases = JSON.parse(
          b.metadata.annotations?.['opendatahub.io/dashboard-feature-visibility'] ?? '[]',
        ).toSorted();

        // First sort by length
        const lengthDiff = aUseCases.length - bUseCases.length;
        if (lengthDiff !== 0) {
          return lengthDiff;
        }

        // Compare the sorted arrays element by element
        return aUseCases.join().localeCompare(bUseCases.join());
      } catch {
        return 0;
      }
    },
    info: {
      popover: (
        <>
          Visible features indicate where the hardware profile can be used: in <b>workbenches</b>,
          during <b>model serving</b>, and in LAB-tuning <b>pipelines</b>.
        </>
      ),
      popoverProps: {
        showClose: false,
      },
    },
    width: 30,
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
    sortable: (a: HardwareProfileKind, b: HardwareProfileKind): number => {
      const first = a.metadata.annotations?.['opendatahub.io/modified-date'];
      const second = b.metadata.annotations?.['opendatahub.io/modified-date'];
      return new Date(first ?? 0).getTime() - new Date(second ?? 0).getTime();
    },
    width: 30,
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
  [ManageHardwareProfileSectionID.NODE_SELECTORS]: 'Node selectors',
  [ManageHardwareProfileSectionID.TOLERATIONS]: 'Tolerations',
};

export const DEFAULT_HARDWARE_PROFILE_SPEC: HardwareProfileKind['spec'] = {
  displayName: '',
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
