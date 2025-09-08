export const FEATURE_STORE_TYPE_TO_CATEGORY: { [key: string]: string } = {
  entity: 'Entities',
  dataSource: 'Data Sources',
  featureView: 'Feature Views',
  feature: 'Features',
  featureService: 'Feature Services',
} as const;

export type FeatureStoreTypeToCategory = typeof FEATURE_STORE_TYPE_TO_CATEGORY;
export type FeatureStoreCategory =
  | FeatureStoreTypeToCategory[keyof FeatureStoreTypeToCategory]
  | string;
