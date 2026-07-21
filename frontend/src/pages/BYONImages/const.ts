import { SimpleSelectOption } from '@odh-dashboard/ui-core/components/SimpleSelect';

export enum BYONImagesToolbarFilterOptions {
  name = 'Name',
  provider = 'Provider',
  type = 'Type',
  enabled = 'Enabled',
}

export const byonImagesFilterOptions = {
  [BYONImagesToolbarFilterOptions.name]: 'Name',
  [BYONImagesToolbarFilterOptions.provider]: 'Provider',
  [BYONImagesToolbarFilterOptions.type]: 'Type',
  [BYONImagesToolbarFilterOptions.enabled]: 'Enabled',
};

export enum ImageTypeFilter {
  redHat = 'redHat',
  custom = 'custom',
}

export const imageTypeFilterOptions: SimpleSelectOption[] = [
  { key: ImageTypeFilter.redHat, label: 'Red Hat' },
  { key: ImageTypeFilter.custom, label: 'Custom' },
];

export enum ImageEnabledFilter {
  enabled = 'enabled',
  disabled = 'disabled',
}

export const imageEnabledFilterOptions: SimpleSelectOption[] = [
  { key: ImageEnabledFilter.enabled, label: 'Enabled' },
  { key: ImageEnabledFilter.disabled, label: 'Disabled' },
];

export type BYONImagesFilterDataType = Record<BYONImagesToolbarFilterOptions, string | undefined>;

export const initialBYONImagesFilterData: BYONImagesFilterDataType = {
  [BYONImagesToolbarFilterOptions.name]: '',
  [BYONImagesToolbarFilterOptions.provider]: '',
  [BYONImagesToolbarFilterOptions.type]: undefined,
  [BYONImagesToolbarFilterOptions.enabled]: undefined,
};
