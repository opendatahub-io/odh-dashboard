export enum BYONImagesToolbarFilterOptions {
  name = 'Name',
  provider = 'Provider',
}

export const byonImagesFilterOptions = {
  [BYONImagesToolbarFilterOptions.name]: 'Name',
  [BYONImagesToolbarFilterOptions.provider]: 'Provider',
};

export type BYONImagesFilterDataType = Record<BYONImagesToolbarFilterOptions, string | undefined>;

export const initialBYONImagesFilterData: BYONImagesFilterDataType = {
  [BYONImagesToolbarFilterOptions.name]: '',
  [BYONImagesToolbarFilterOptions.provider]: '',
};
