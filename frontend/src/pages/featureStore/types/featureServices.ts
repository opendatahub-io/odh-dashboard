import { K8sAPIOptions } from '#~/k8sTypes';
import { BatchSource, FeatureStoreMeta, FeatureStoreRelationship } from './global';
import { FeatureColumns } from './features';

export type FeatureServiceFeatures = {
  featureViewName: string;
  featureColumns: FeatureColumns[];
  timestampField?: string;
  createdTimestampColumn?: string;
  batchSource?: BatchSource;
}[];

export type FeatureService = {
  spec: {
    name: string;
    features?: FeatureServiceFeatures;
    tags?: Record<string, string>;
    description?: string;
    owner?: string;
  };
  meta: FeatureStoreMeta;
  relationships?: FeatureStoreRelationship[];
  project?: string;
  featureDefinition?: string;
};

export type FeatureServicesList = {
  featureServices: FeatureService[];
  pagination: {
    totalCount: number;
    totalPages: number;
  };
  relationships: Record<string, FeatureStoreRelationship[]>;
};

export type GetFeatureServices = (
  opts: K8sAPIOptions,
  project?: string,
) => Promise<FeatureServicesList>;

export type GetFeatureServiceByName = (
  opts: K8sAPIOptions,
  project: string,
  featureServiceName: string,
) => Promise<FeatureService>;
