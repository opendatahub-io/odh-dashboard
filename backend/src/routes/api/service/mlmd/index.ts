import { DSPipelineKind } from '../../../../types';
import { proxyService } from '../../../../utils/proxy';

export default proxyService<DSPipelineKind>(
  {
    apiGroup: 'datasciencepipelinesapplications.opendatahub.io',
    apiVersion: 'v1',
    kind: 'DataSciencepipelinesApplication',
    plural: 'datasciencepipelinesapplications',
  },
  {
    constructUrl: (resource: DSPipelineKind) => resource.status?.components.mlmdProxy.url,
  },
  {
    // Use port forwarding for local development:
    // kubectl port-forward -n <namespace> svc/ds-pipeline-md-dspa 10001:8443
    host: process.env.METADATA_ENVOY_SERVICE_HOST,
    port: process.env.METADATA_ENVOY_SERVICE_PORT,
  },
  (resource) =>
    resource.spec.dspVersion === 'v2' &&
    !!resource.status?.conditions?.find((c) => c.type === 'APIServerReady' && c.status === 'True'),
);
