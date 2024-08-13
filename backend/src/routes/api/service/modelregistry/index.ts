import { MODEL_REGISTRY_NAMESPACE } from '../../../../utils/constants';
import { proxyService } from '../../../../utils/proxy';

export default proxyService(
  null,
  {
    port: 8080,
    namespace: MODEL_REGISTRY_NAMESPACE,
  },
  {
    // Use port forwarding for local development:
    // kubectl port-forward -n odh-model-registries svc/<service-name> 8085:8080
    host: process.env.MODEL_REGISTRY_SERVICE_HOST,
    port: process.env.MODEL_REGISTRY_SERVICE_PORT,
  },
  null,
  false,
);
