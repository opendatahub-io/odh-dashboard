import { FeatureService } from '#~/pages/featureStore/types/featureServices.ts';

export const countFeatures = (featureService: FeatureService): number | undefined =>
  featureService.spec.features?.reduce((acc, fv) => acc + (fv.featureColumns.length || 0), 0);
