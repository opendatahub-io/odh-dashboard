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
    constructUrl: (resource: DSPipelineKind) => resource.status?.components.apiServer.url,
  },
  {
    // Use port forwarding for local development:
    // kubectl port-forward -n <namespace> svc/ds-pipeline-dspa 8443:8443
    host: process.env.DS_PIPELINE_DSPA_SERVICE_HOST,
    port: process.env.DS_PIPELINE_DSPA_SERVICE_PORT,
  },
  (resource) =>
    !!resource.status?.conditions?.find((c) => c.type === 'APIServerReady' && c.status === 'True'),
);
