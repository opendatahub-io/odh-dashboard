import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { K8sAPIOptions, PodKind } from '@odh-dashboard/internal/k8sTypes';
import { FeatureStoreModel } from '@odh-dashboard/internal/api/models/odh';
import { PodModel } from '@odh-dashboard/internal/api/models/k8s';
import { applyK8sAPIOptions } from '@odh-dashboard/internal/api/apiMergeUtils';
import { kindApiVersion } from '@odh-dashboard/internal/concepts/k8s/utils';
import {
  FeatureStoreKind,
  FeastServices,
  FeastProjectDir,
  FeastAuthzConfig,
  FeastCronJob,
  FeastBatchEngineConfig,
} from '../k8sTypes';

/**
 * Validates the minimum shape required by every consumer
 * (metadata.name, metadata.namespace, spec.feastProject).
 * These are required fields in the type, but a version-skewed or
 * partially-populated response could still deliver empty strings.
 */
const isValidFeatureStore = (fs: FeatureStoreKind): boolean =>
  Boolean(fs.metadata.name && fs.metadata.namespace && fs.spec.feastProject);

/**
 * Ensures optional sub-trees that consumers read with optional chaining
 * are present with safe defaults so downstream code never encounters
 * e.g. `undefined.conditions`.
 */
const normalizeFeatureStore = (fs: FeatureStoreKind): FeatureStoreKind => ({
  ...fs,
  metadata: {
    ...fs.metadata,
    labels: fs.metadata.labels ?? {},
    annotations: fs.metadata.annotations ?? {},
  },
  status: fs.status
    ? {
        ...fs.status,
        conditions: fs.status.conditions ?? [],
        phase: fs.status.phase ?? 'Pending',
        serviceHostnames: fs.status.serviceHostnames ?? {},
      }
    : undefined,
});

const normalizeFeatureStoreList = (items: FeatureStoreKind[]): FeatureStoreKind[] =>
  items.filter(isValidFeatureStore).map(normalizeFeatureStore);

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
  }).then((listResource) => normalizeFeatureStoreList(listResource.items));

export const listAllFeatureStores = (): Promise<FeatureStoreKind[]> =>
  k8sListResource<FeatureStoreKind>({
    model: FeatureStoreModel,
    queryOptions: {},
  }).then((listResource) => normalizeFeatureStoreList(listResource.items));

export const getFeatureStore = (namespace: string, name: string): Promise<FeatureStoreKind> =>
  k8sGetResource<FeatureStoreKind>({
    model: FeatureStoreModel,
    queryOptions: {
      name,
      ns: namespace,
    },
  }).then(normalizeFeatureStore);

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
