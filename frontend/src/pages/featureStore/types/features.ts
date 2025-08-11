import { K8sAPIOptions } from '#~/k8sTypes.ts';
import { FeatureStorePagination, NameValueTypePair } from './global';

export type FeatureColumns = NameValueTypePair & {
  tags?: Record<string, string>;
  description?: string;
};

export type FeatureConnection = {
  type: string;
  name: string;
};

export type FeatureRelationship = {
  source: FeatureConnection;
  target: FeatureConnection;
};

export type Features = {
  name: string;
  featureView: string;
  type?: string;
  project?: string;
  owner?: string;
  tags?: Record<string, string>;
  description?: string;
  relationships?: FeatureRelationship[];
  featureDefinition?: string;
};

export type FeaturesList = {
  features: Features[];
  pagination: FeatureStorePagination;
};

export type GetFeatures = (opts: K8sAPIOptions, project?: string) => Promise<FeaturesList>;

export type GetFeatureByName = (
  opts: K8sAPIOptions,
  project: string,
  featureViewName: string,
  featureName: string,
) => Promise<Features>;
