import { genUID } from '~/__mocks__/mockUtils';
import { K8sModelCommonMetadata, ServiceAccountKind } from '~/k8sTypes';

type MockResourceConfigType = {
  name?: string;
  namespace?: string;
};

export const mockServiceAccountK8sResource = ({
  name = 'test-name-sa',
  namespace = 'test-project',
}: MockResourceConfigType): ServiceAccountKind => ({
  kind: 'ServiceAccount',
  apiVersion: 'v1',
  metadata: {
    name,
    namespace,
    uid: genUID('serviceaccount'),
    creationTimestamp: '2023-02-14T21:43:59Z',
  },
});

export const ServiceAccountModelTest: K8sModelCommonMetadata = {
  apiVersion: 'v1',
  kind: 'ServiceAccount',
  metadata: { name: 'test-name-sa', namespace: 'test-project', ownerReferences: [] },
};
