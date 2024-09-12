import { Connection } from '~/concepts/connectionTypes/types';

type MockConnection = {
  name?: string;
  namespace?: string;
  connectionType?: string;
  displayName?: string;
  description?: string;
  data?: { [key: string]: string };
};

export const mockConnection = ({
  name = 's3-connection',
  namespace = 'ds-project-1',
  connectionType = 's3',
  displayName,
  description,
  data = {},
}: MockConnection): Connection => ({
  kind: 'Secret',
  apiVersion: 'v1',
  metadata: {
    name,
    namespace,
    labels: { 'opendatahub.io/dashboard': 'true', 'opendatahub.io/managed': 'true' },
    annotations: {
      'opendatahub.io/connection-type': connectionType,
      ...(displayName && { 'openshift.io/display-name': displayName }),
      ...(description && { 'openshift.io/description': description }),
    },
  },
  data,
});
