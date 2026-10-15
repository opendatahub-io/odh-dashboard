import type { AIHubKind, AIHubNamespaceResponse } from '../k8sTypes';

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

export const mockAIHubNamespaceResponse = ({
  instancesNamespace = 'odh-model-registries',
}: Pick<MockAIHubType, 'instancesNamespace'> = {}): AIHubNamespaceResponse => ({
  instancesNamespace,
});
