import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import {
  FeatureStoreKind,
  FeastServices,
  FeastProjectDir,
  FeastAuthzConfig,
  FeastCronJob,
  FeastBatchEngineConfig,
  K8sAPIOptions,
  PodKind,
} from '#~/k8sTypes';
import { FeatureStoreModel, PodModel } from '#~/api/models';
import { applyK8sAPIOptions } from '#~/api/apiMergeUtils';
import { kindApiVersion } from '#~/concepts/k8s/utils';

export type FeatureStoreFormSpec = {
  feastProject: string;
  namespace: string;
  feastProjectDir?: FeastProjectDir;
  services?: FeastServices;
  authz?: FeastAuthzConfig;
  cronJob?: FeastCronJob;
  batchEngine?: FeastBatchEngineConfig;
  replicas?: number;
  labels?: Record<string, string>;
};

export const assembleFeatureStore = (formData: FeatureStoreFormSpec): FeatureStoreKind => {
  const { namespace, labels, ...specFields } = formData;
  const spec: FeatureStoreKind['spec'] = {
    feastProject: specFields.feastProject,
  };

  if (specFields.feastProjectDir) {
    spec.feastProjectDir = specFields.feastProjectDir;
  }
  if (specFields.services) {
    spec.services = specFields.services;
  }
  if (specFields.authz) {
    spec.authz = specFields.authz;
  }
  if (specFields.cronJob) {
    spec.cronJob = specFields.cronJob;
  }
  if (specFields.batchEngine) {
    spec.batchEngine = specFields.batchEngine;
  }
  if (specFields.replicas != null && specFields.replicas > 1) {
    spec.replicas = specFields.replicas;
  }

  return {
    apiVersion: kindApiVersion(FeatureStoreModel),
    kind: FeatureStoreModel.kind,
    metadata: {
      name: specFields.feastProject,
      namespace,
      ...(labels && Object.keys(labels).length > 0 && { labels }),
    },
    spec,
  };
};

export const createFeatureStore = (
  formData: FeatureStoreFormSpec,
  opts?: K8sAPIOptions,
): Promise<FeatureStoreKind> => {
  const resource = assembleFeatureStore(formData);
  return k8sCreateResource<FeatureStoreKind>(
    applyK8sAPIOptions(
      {
        model: FeatureStoreModel,
        resource,
      },
      opts,
    ),
  );
};

export const listFeatureStores = (namespace: string): Promise<FeatureStoreKind[]> =>
  k8sListResource<FeatureStoreKind>({
    model: FeatureStoreModel,
    queryOptions: {
      ns: namespace,
    },
  }).then((listResource) => listResource.items);

export const listAllFeatureStores = (): Promise<FeatureStoreKind[]> =>
  k8sListResource<FeatureStoreKind>({
    model: FeatureStoreModel,
    queryOptions: {},
  }).then((listResource) => listResource.items);

export const getFeatureStore = (namespace: string, name: string): Promise<FeatureStoreKind> =>
  k8sGetResource<FeatureStoreKind>({
    model: FeatureStoreModel,
    queryOptions: {
      name,
      ns: namespace,
    },
  });

export const deleteFeatureStore = (namespace: string, name: string): Promise<FeatureStoreKind> =>
  k8sDeleteResource<FeatureStoreKind>({
    model: FeatureStoreModel,
    queryOptions: { name, ns: namespace },
  });

export const getPodsForFeatureStore = (
  namespace: string,
  featureStoreName: string,
): Promise<PodKind[]> =>
  k8sListResource<PodKind>({
    model: PodModel,
    queryOptions: {
      ns: namespace,
      queryParams: { labelSelector: `feast.dev/name=${featureStoreName}` },
    },
  }).then((r) => r.items);
