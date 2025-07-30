import { FeatureStoreMeta } from './global';
import { Features } from './features';

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
