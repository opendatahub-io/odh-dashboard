import { CatalogModel } from '~/app/modelCatalogTypes';
import { HfAccessType } from '~/concepts/modelCatalog/const';
import {
  getHfAccessType,
  getHfGatedAccessGranted,
  isGatedAccessType,
} from '~/app/pages/modelCatalog/utils/modelCatalogUtils';

export type ModelCatalogTrackingHfAccessType =
  | 'public'
  | 'private'
  | 'gated_auto'
  | 'gated_manual'
  | 'other';

export const getModelCatalogTrackingHfAccessType = (
  model: CatalogModel,
): ModelCatalogTrackingHfAccessType => {
  const accessType = getHfAccessType(model);
  if (!accessType) {
    return 'other';
  }
  if (accessType === HfAccessType.PUBLIC) {
    return 'public';
  }
  if (accessType === HfAccessType.PRIVATE) {
    return 'private';
  }
  if (accessType === HfAccessType.GATED_AUTO) {
    return 'gated_auto';
  }
  if (accessType === HfAccessType.GATED_MANUAL) {
    return 'gated_manual';
  }
  return 'other';
};

export const getModelCatalogIsAccessGranted = (model: CatalogModel): boolean => {
  const accessType = getHfAccessType(model);
  if (!accessType || accessType === HfAccessType.PUBLIC || accessType === HfAccessType.PRIVATE) {
    return true;
  }
  if (isGatedAccessType(accessType)) {
    return getHfGatedAccessGranted(model);
  }
  return true;
};
