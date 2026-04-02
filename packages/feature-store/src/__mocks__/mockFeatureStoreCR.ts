import { FeatureStoreKind } from '../k8sTypes';

type MockFeatureStoreCROptions = {
  name?: string;
  namespace?: string;
  feastProject?: string;
  phase?: string;
  feastVersion?: string;
  labels?: Record<string, string>;
  spec?: Partial<FeatureStoreKind['spec']>;
  status?: Partial<NonNullable<FeatureStoreKind['status']>>;
  creationTimestamp?: string;
  uid?: string;
};

export const mockFeatureStoreCR = (options: MockFeatureStoreCROptions = {}): FeatureStoreKind => ({
  apiVersion: 'feast.dev/v1',
  kind: 'FeatureStore',
  metadata: {
    name: options.name ?? 'my-feature-store',
    namespace: options.namespace ?? 'test-ns',
    uid: options.uid ?? `uid-${options.name ?? 'my-feature-store'}`,
    creationTimestamp: options.creationTimestamp ?? '2025-07-01T10:00:00Z',
    labels: options.labels ?? {},
    annotations: {},
  },
  spec: {
    feastProject: options.feastProject ?? options.name ?? 'my-feature-store',
    ...options.spec,
  },
  status: {
    phase: options.phase ?? 'Ready',
    feastVersion: options.feastVersion ?? '0.47.0',
    conditions: [],
    serviceHostnames: {},
    ...options.status,
  },
});
