import { ConfigMapKind } from '~/k8sTypes';

type MockConfigMapType = {
  data?: Record<string, string>;
  namespace?: string;
};
export const mockConfigMap = ({
  data = { key: 'value' },
  namespace = 'test-project',
}: MockConfigMapType): ConfigMapKind => ({
  kind: 'ConfigMap',
  apiVersion: 'v1',
  metadata: {
    name: 'config-test',
    labels: { 'opendatahub.io/dashboard': 'true' },
    namespace,
  },
  data,
});
