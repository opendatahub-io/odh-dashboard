import { SortableData } from '#~/components/table';
import { AcceleratorProfileKind } from '#~/k8sTypes';

export const columns: SortableData<AcceleratorProfileKind>[] = [
  {
    field: 'name',
    label: 'Name',
    sortable: (a, b) => a.spec.displayName.localeCompare(b.spec.displayName),
    width: 30,
  },
  {
    field: 'identifier',
    label: 'Identifier',
    sortable: (a, b) => a.spec.identifier.localeCompare(b.spec.identifier),
    info: {
      popover: 'The resource identifier of the accelerator device.',
      popoverProps: {
        showClose: false,
      },
    },
  },
  {
    field: 'enablement',
    label: 'Enable',
    sortable: (a, b) => Number(a.spec.enabled) - Number(b.spec.enabled),
    info: {
      popover: 'Indicates whether the accelerator profile is available for new resources.',
      popoverProps: {
        showClose: false,
      },
    },
  },
  {
    field: 'last_modified',
    label: 'Last modified',
    sortable: (a: AcceleratorProfileKind, b: AcceleratorProfileKind): number => {
      const first = a.metadata.annotations?.['opendatahub.io/modified-date'];
      const second = b.metadata.annotations?.['opendatahub.io/modified-date'];
      return new Date(first ?? 0).getTime() - new Date(second ?? 0).getTime();
    },
  },
  {
    field: 'kebab',
    label: '',
    sortable: false,
  },
];

export enum AcceleratorProfilesToolbarFilterOptions {
  name = 'Name',
  identifier = 'Identifier',
}

export const acceleratorProfilesFilterOptions = {
  [AcceleratorProfilesToolbarFilterOptions.name]: 'Name',
  [AcceleratorProfilesToolbarFilterOptions.identifier]: 'Identifier',
};

export type AcceleratorProfilesFilterDataType = Record<
  AcceleratorProfilesToolbarFilterOptions,
  string | undefined
>;

export const initialAcceleratorProfilesFilterData: AcceleratorProfilesFilterDataType = {
  [AcceleratorProfilesToolbarFilterOptions.name]: '',
  [AcceleratorProfilesToolbarFilterOptions.identifier]: '',
};
