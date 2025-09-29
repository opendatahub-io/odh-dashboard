export const FEATURE_STORE_TYPE_TO_CATEGORY: { [key: string]: string } = {
  entity: 'Entities',
  dataSource: 'Data sources',
  featureView: 'Feature views',
  feature: 'Features',
  featureService: 'Feature services',
  savedDataset: 'Datasets',
} as const;

export type FeatureStoreTypeToCategory = typeof FEATURE_STORE_TYPE_TO_CATEGORY;
export type FeatureStoreCategory =
  | FeatureStoreTypeToCategory[keyof FeatureStoreTypeToCategory]
  | string;
