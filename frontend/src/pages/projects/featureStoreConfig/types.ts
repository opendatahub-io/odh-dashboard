import { ConfigMapKind } from '#~/k8sTypes';

export interface FeatureStoreNamespace {
  namespace: string;
  clientConfigs: string[];
}

export interface FeatureStoreClientConfig {
  namespace: string;
  configName: string;
  configMap: ConfigMapKind;
  hasAccessToFeatureStore?: boolean;
}

export interface FeatureStoreConfigurationsResult {
  clientConfigs: FeatureStoreClientConfig[];
  namespaces: FeatureStoreNamespace[];
}

export enum FilterOptions {
  NAME = 'name',
  PROJECT = 'repository',
  CREATED = 'created',
}

export type FilterData = {
  [FilterOptions.NAME]: string;
  [FilterOptions.PROJECT]: string;
  [FilterOptions.CREATED]: string;
};
