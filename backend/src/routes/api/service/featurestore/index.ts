import { FeatureStoreKind } from '../../../../types';
import { proxyService } from '../../../../utils/proxy';

export default proxyService<FeatureStoreKind>(
  {
    apiGroup: 'feast.dev',
    apiVersion: 'v1alpha1',
    kind: 'FeatureStore',
    plural: 'featurestores',
  },
  {
    internalPort: 443,
    suffix: '-registry-rest',
  },
  {
    // Use port forwarding for local development:
    // kubectl port-forward -n <namespace> svc/feast-<name>-registry-rest 8443:443
    host: process.env.FEAST_REGISTRY_SERVICE_HOST,
    port: process.env.FEAST_REGISTRY_SERVICE_PORT,
  },
  (resource) =>
    !!resource.status?.conditions?.find((c: any) => c.type === 'Registry' && c.status === 'True'),
);
