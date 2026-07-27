import { isValidK8sName, kindApiVersion } from '@odh-dashboard/k8s-core';
import { FeatureStoreModel } from '@odh-dashboard/internal/api/models/odh';
import {
  FeatureStoreKind,
  FeastServices,
  FeastProjectDir,
  FeastAuthzConfig,
  FeastCronJob,
  FeastBatchEngineConfig,
} from '../k8sTypes';

export const isValidFeatureStore = (fs: FeatureStoreKind): boolean =>
  Boolean(fs.metadata.name && fs.metadata.namespace && fs.spec.feastProject);

export const normalizeFeatureStore = (fs: FeatureStoreKind): FeatureStoreKind => ({
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

export const normalizeFeatureStoreList = (items: FeatureStoreKind[]): FeatureStoreKind[] =>
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

  if (!isValidK8sName(namespace)) {
    throw new Error(
      `Invalid namespace "${namespace}". ` +
        'Must be a DNS-1123 subdomain: lowercase alphanumeric characters or hyphens, ' +
        'must start and end with an alphanumeric character.',
    );
  }

  if (!isValidK8sName(specFields.feastProject)) {
    throw new Error(
      `Invalid feastProject name "${specFields.feastProject}". ` +
        'Must be a DNS-1123 subdomain: lowercase alphanumeric characters or hyphens, ' +
        'must start and end with an alphanumeric character.',
    );
  }

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
  // Omit replicas when <= 1; the CRD controller defaults to 1.
  // Scale-to-zero is not a creation-time use case.
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
