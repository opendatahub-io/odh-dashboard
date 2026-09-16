import type { AIHubKind } from '../k8sTypes';

type MockAIHubType = {
  instancesNamespace?: string;
  name?: string;
};

export const mockAIHub = ({
  instancesNamespace = 'odh-model-registries',
  name = 'default-aihub',
}: MockAIHubType = {}): AIHubKind => ({
  apiVersion: 'components.platform.opendatahub.io/v1alpha1',
  kind: 'AIHub',
  metadata: { name },
  spec: { instancesNamespace },
});
