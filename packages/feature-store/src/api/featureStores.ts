import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sListResource,
  K8sStatus,
} from '@openshift/dynamic-plugin-sdk-utils';
import { FeatureStoreModel } from '@odh-dashboard/internal/api/models/odh';
import { PodModel } from '@odh-dashboard/internal/api/models/k8s';
import { applyK8sAPIOptions } from '@odh-dashboard/internal/api/apiMergeUtils';
import { isValidK8sName, K8sAPIOptions, PodKind } from '@odh-dashboard/k8s-core';
import { FeatureStoreKind } from '../k8sTypes';
import {
  assembleFeatureStore,
  normalizeFeatureStore,
  normalizeFeatureStoreList,
  FeatureStoreFormSpec,
} from '../utils/featureStoreUtils';

export { assembleFeatureStore, type FeatureStoreFormSpec } from '../utils/featureStoreUtils';

export const createFeatureStore = async (
  formData: FeatureStoreFormSpec,
  opts?: K8sAPIOptions,
): Promise<FeatureStoreKind> => {
  const resource = assembleFeatureStore(formData);
  const created = await k8sCreateResource<FeatureStoreKind>(
    applyK8sAPIOptions(
      {
        model: FeatureStoreModel,
        resource,
      },
      opts,
    ),
  );
  return normalizeFeatureStore(created);
};

export const listFeatureStores = (namespace: string): Promise<FeatureStoreKind[]> =>
  k8sListResource<FeatureStoreKind>({
    model: FeatureStoreModel,
    queryOptions: {
      ns: namespace,
    },
  }).then((listResource) => normalizeFeatureStoreList(listResource.items));

/**
 * Lists FeatureStore CRs across all namespaces (cluster-wide).
 * Requires cluster-level `list` permission on `featurestores.feast.dev`.
 * Prefer per-namespace {@link listFeatureStores} gated by SSAR for unprivileged users.
 */
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

export const deleteFeatureStore = (namespace: string, name: string): Promise<K8sStatus> =>
  k8sDeleteResource<FeatureStoreKind, K8sStatus>({
    model: FeatureStoreModel,
    queryOptions: { name, ns: namespace },
  });

export const getPodsForFeatureStore = async (
  namespace: string,
  featureStoreName: string,
): Promise<PodKind[]> => {
  if (!isValidK8sName(featureStoreName)) {
    throw new Error(
      `Invalid featureStoreName "${featureStoreName}". Must be a valid DNS-1123 label.`,
    );
  }
  const result = await k8sListResource<PodKind>({
    model: PodModel,
    queryOptions: {
      ns: namespace,
      queryParams: { labelSelector: `feast.dev/name=${featureStoreName}` },
    },
  });
  return result.items;
};
