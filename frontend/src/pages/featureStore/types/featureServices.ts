import { Features } from './features';
import { FeatureStoreMeta } from './global';

export type FeatureService = {
  spec: {
    name: string;
    features?: Features;
    tags?: Record<string, string>;
    description?: string;
    owner?: string;
  };
  meta: FeatureStoreMeta;
};

export type FeatureServices = {
  featureServices: FeatureService[];
};
