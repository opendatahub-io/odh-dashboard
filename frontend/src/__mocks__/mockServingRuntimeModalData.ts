import type { CreatingServingRuntimeObject } from '@odh-dashboard/model-serving/shared';

type MockResourceConfigType = Partial<CreatingServingRuntimeObject>;

export const mockServingRuntimeModalData = ({
  name = 'My Inference Service',
  k8sName = 'my-inference-service-test',
  servingRuntimeTemplateName = 'caikit',
  numReplicas = 1,
  externalRoute = false,
  tokenAuth = false,
  tokens = [],
}: MockResourceConfigType): CreatingServingRuntimeObject => ({
  name,
  k8sName,
  servingRuntimeTemplateName,
  numReplicas,
  externalRoute,
  tokenAuth,
  tokens,
});
