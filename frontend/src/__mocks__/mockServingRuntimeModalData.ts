import { CreatingServingRuntimeObject } from '~/pages/modelServing/screens/types';

type MockResourceConfigType = Partial<CreatingServingRuntimeObject>;

export const mockServingRuntimeModalData = ({
  name = 'my-inference-service',
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
  servingRuntimeTemplateName,
  numReplicas,
  modelSize,
  externalRoute,
  tokenAuth,
  tokens,
});
