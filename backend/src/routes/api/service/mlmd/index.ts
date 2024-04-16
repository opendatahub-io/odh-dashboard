import { DEV_MODE } from '../../../../utils/constants';
import { DSPipelineKind } from '../../../../types';
import { proxyService } from '../../../../utils/proxy';

export default DEV_MODE
  ? proxyService<DSPipelineKind>(
      {
        apiGroup: 'datasciencepipelinesapplications.opendatahub.io',
        apiVersion: 'v1alpha1',
        kind: 'DataSciencepipelinesApplication',
        plural: 'datasciencepipelinesapplications',
      },
      {
        port: 9090,
        prefix: 'ds-pipeline-metadata-envoy-',
      },
      {
        // Use port forwarding for local development:
        // kubectl port-forward -n <namespace> svc/ds-pipeline-metadata-envoy-dspa 9090:9090
        host: process.env.METADATA_ENVOY_SERVICE_HOST,
        port: process.env.METADATA_ENVOY_SERVICE_PORT,
      },
      (resource) =>
        resource.spec.dspVersion === 'v2' &&
        !!resource.status?.conditions?.find(
          (c) => c.type === 'APIServerReady' && c.status === 'True',
        ),
      false,
    )
  : async () => {
      // do nothing
      // service is only registered in DEV_MODE
    };
