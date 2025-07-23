import { FeatureStoreObject } from './const';

export const getFeatureStoreObjectDisplayName = (
  featureStoreObject: FeatureStoreObject,
): string => {
  switch (featureStoreObject) {
    case FeatureStoreObject.ENTITIES:
      return 'Entities';
    case FeatureStoreObject.FEATURE_VIEWS:
      return 'Feature Views';
    case FeatureStoreObject.FEATURE_SERVICES:
      return 'Feature Services';
    default:
      return featureStoreObject;
  }
};
