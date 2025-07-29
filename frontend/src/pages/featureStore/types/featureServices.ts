import { K8sAPIOptions } from '#~/k8sTypes';
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
  project?: string;
};

export type FeatureServicesList = {
  featureServices: FeatureService[];
  pagination: {
    totalCount: number;
    totalPages: number;
  };
};

export type GetFeatureServices = (
  opts: K8sAPIOptions,
  project?: string,
) => Promise<FeatureServicesList>;
