import { ConfigMapKind } from '#~/k8sTypes';

type MockConfigMapType = {
  data?: Record<string, string>;
  namespace?: string;
  name?: string;
};
export const mockConfigMap = ({
  data = { key: 'value' },
  namespace = 'test-project',
  name = 'config-test',
}: MockConfigMapType): ConfigMapKind => ({
  kind: 'ConfigMap',
  apiVersion: 'v1',
  metadata: {
    name,
    labels: { 'opendatahub.io/dashboard': 'true' },
    namespace,
  },
  data,
});
