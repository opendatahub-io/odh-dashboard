import { Stack, StackItem, Title } from '@patternfly/react-core';
import React from 'react';
import { SortableData } from '~/components/table';
import { HardwareProfileKind, HardwareProfileVisibleIn } from '~/k8sTypes';
import {
  ManageHardwareProfileSectionID,
  ManageHardwareProfileSectionTitlesType,
} from '~/pages/hardwareProfiles/manage/types';
import { IdentifierResourceType } from '~/types';

const HARDWARE_PROFILE_VISIBILITY_DETAILS: Record<
  HardwareProfileVisibleIn,
  {
    label: string;
    description: string;
    areas: string[];
  }
> = {
  [HardwareProfileVisibleIn.NOTEBOOKS]: {
    label: 'Notebooks',
    description: 'The hardware profile is visible where notebooks are deployed.',
    areas: ['Workbenches, Jupyter'],
  },
  [HardwareProfileVisibleIn.SERVING]: {
    label: 'Model serving',
    description: 'The hardware profile is visible in serving.',
    areas: ['serving'],
  },
  [HardwareProfileVisibleIn.INSTRUCTLAB]: {
    label: 'Instructlab',
    description: 'The hardware profile is visible in instructlab.',
    areas: ['instructlab'],
  },
};
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
    field: 'visibility',
    label: 'Visibility',
    sortable: false,
    info: {
      popover: (
        <Stack hasGutter>
          <StackItem>
            <Title headingLevel="h4">
              Indicates the areas where the hardware profile is visible.
            </Title>
          </StackItem>
          {Object.values(HardwareProfileVisibleIn).map((v) => (
            <StackItem key={v}>
              <Stack>
                <StackItem>
                  <Title headingLevel="h5">{HARDWARE_PROFILE_VISIBILITY_DETAILS[v].label}</Title>
                </StackItem>
                <StackItem>
                  <p>{HARDWARE_PROFILE_VISIBILITY_DETAILS[v].description}</p>
                </StackItem>
                <StackItem>
                  <p>
                    <i>{HARDWARE_PROFILE_VISIBILITY_DETAILS[v].areas.join(', ')}</i>
                  </p>
                </StackItem>
              </Stack>
            </StackItem>
          ))}
        </Stack>
      ),
      popoverProps: {
        showClose: false,
      },
    },
    width: 30,
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
}

export const hardwareProfileFilterOptions = {
  [HardwareProfileFilterOptions.name]: 'Name',
  [HardwareProfileFilterOptions.enabled]: 'Enabled',
};

export type HardwareProfileFilterDataType = Record<
  HardwareProfileFilterOptions,
  string | undefined
>;

export const initialHardwareProfileFilterData: HardwareProfileFilterDataType = {
  [HardwareProfileFilterOptions.name]: '',
  [HardwareProfileFilterOptions.enabled]: undefined,
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
