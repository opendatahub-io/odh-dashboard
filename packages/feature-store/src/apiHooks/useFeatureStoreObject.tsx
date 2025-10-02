import { useLocation } from 'react-router';
import { FeatureStoreObject } from '../const';

/**
 * Utility function to extract the featureStoreObject from a given pathname.
 */
export function getFeatureStoreObjectFromPath(pathname: string): FeatureStoreObject {
  const featureStoreObject = pathname.split('/')[3];
  if (featureStoreObject) {
    // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
    return featureStoreObject as FeatureStoreObject;
  }
  return FeatureStoreObject.ENTITIES; // TODO: change default to overview page once we have it
}

export function useFeatureStoreObject(): FeatureStoreObject {
  const location = useLocation();
  return getFeatureStoreObjectFromPath(location.pathname);
}
