import { getModelRegistryNamespace } from '../../../api/modelRegistries/modelRegistryUtils';
import { ServiceAddressAnnotation } from '../../../../types';
import { proxyService } from '../../../../utils/proxy';

export default proxyService(
  null,
  {
    addressAnnotation: ServiceAddressAnnotation.EXTERNAL_REST,
    internalPort: 8080,
    namespace: getModelRegistryNamespace,
  },
  {
    // Use port forwarding for local development:
    // kubectl port-forward -n odh-model-registries svc/<service-name> 8085:8080
    host: process.env.MODEL_REGISTRY_SERVICE_HOST,
    port: process.env.MODEL_REGISTRY_SERVICE_PORT,
  },
  null,
);
