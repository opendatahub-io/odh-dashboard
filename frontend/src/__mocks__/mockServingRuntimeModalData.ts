import { CreatingServingRuntimeObject } from '~/pages/modelServing/screens/types';

type MockResourceConfigType = Partial<CreatingServingRuntimeObject>;

export const mockServingRuntimeModalData = ({
  name = 'My Inference Service',
  k8sName = 'my-inference-service-test',
  servingRuntimeTemplateName = 'caikit',
  numReplicas = 1,
  modelSize = {
    name: 'small',
    resources: {
      requests: {
        cpu: '1',
        memory: '1Gi',
      },
      limits: {
        cpu: '1',
        memory: '1Gi',
      },
    },
  },
  externalRoute = false,
  tokenAuth = false,
  tokens = [],
}: MockResourceConfigType): CreatingServingRuntimeObject => ({
  name,
  k8sName,
  servingRuntimeTemplateName,
  numReplicas,
  modelSize,
  externalRoute,
  tokenAuth,
  tokens,
});
