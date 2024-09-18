import { TrustyAIKind } from '../../../../types';
import { proxyService } from '../../../../utils/proxy';

export default proxyService<TrustyAIKind>(
  {
    apiGroup: 'trustyai.opendatahub.io',
    apiVersion: 'v1alpha1',
    kind: 'TrustyAIService',
    plural: 'trustyaiservices',
  },
  {
    internalPort: 443,
    suffix: '-tls',
  },
  {
    // Use port forwarding for local development:
    // kubectl port-forward -n <namespace> svc/trustyai-service-tls 9443:443
    host: process.env.TRUSTYAI_TAIS_SERVICE_HOST,
    port: process.env.TRUSTYAI_TAIS_SERVICE_PORT,
  },
  (resource) =>
    !!resource.status?.conditions?.find((c) => c.type === 'Available' && c.status === 'True'),
);
