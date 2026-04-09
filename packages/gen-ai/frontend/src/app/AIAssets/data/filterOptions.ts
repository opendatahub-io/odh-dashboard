export enum AssetsFilterOptions {
  NAME = 'name',
  USE_CASE = 'useCase',
  STATUS = 'status',
}

export enum AssetsFilterColors {
  NAME = 'blue',
  USE_CASE = 'purple',
  STATUS = 'orange',
}

export const assetsFilterOptions: Record<string, string> = {
  [AssetsFilterOptions.NAME]: 'Name',
  [AssetsFilterOptions.USE_CASE]: 'Use Case',
  [AssetsFilterOptions.STATUS]: 'Status',
};

export const assetsFilterSelectOptions: Partial<Record<AssetsFilterOptions, string[]>> = {
  [AssetsFilterOptions.STATUS]: ['Ready', 'Inactive', 'Unknown'],
};
