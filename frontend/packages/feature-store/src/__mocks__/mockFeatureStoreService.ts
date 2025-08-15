import { ServiceKind } from '@odh-dashboard/internal/k8sTypes';

type MockFeatureStoreServiceType = {
  name?: string;
  namespace?: string;
  featureStoreName?: string;
  clusterIP?: string;
  port?: number;
  targetPort?: number;
};

export const mockFeatureStoreService = ({
  name = 'feast-demo-registry-rest',
  namespace = 'default',
  featureStoreName = 'demo',
  clusterIP = '172.30.50.241',
  port = 443,
  targetPort = 6573,
}: MockFeatureStoreServiceType): ServiceKind => ({
  kind: 'Service',
  apiVersion: 'v1',
  metadata: {
    name,
    namespace,
    annotations: {
      'service.alpha.openshift.io/serving-cert-signed-by':
        'openshift-service-serving-signer@1750093593',
      'service.beta.openshift.io/serving-cert-secret-name': `${name}-tls`,
      'service.beta.openshift.io/serving-cert-signed-by':
        'openshift-service-serving-signer@1750093593',
    },
    labels: {
      'feast.dev/name': featureStoreName,
      'feast.dev/service-type': 'registry',
    },
    ownerReferences: [
      {
        apiVersion: 'feast.dev/v1alpha1',
        kind: 'FeatureStore',
        name: featureStoreName,
        uid: 'bf7d217f-4f10-4b67-b188-3d9478fc93ed',
        controller: true,
        blockOwnerDeletion: true,
      },
    ],
    resourceVersion: '19247168',
    uid: 'e101a23b-0eb2-42c7-bff0-95eef8cf2625',
    creationTimestamp: '2025-07-02T12:43:18Z',
  },
  spec: {
    clusterIP,
    ipFamilies: ['IPv4'],
    ports: [
      {
        name: 'https',
        protocol: 'TCP',
        port,
        targetPort,
      },
    ],
    internalTrafficPolicy: 'Cluster',
    clusterIPs: [clusterIP],
    type: 'ClusterIP',
    ipFamilyPolicy: 'SingleStack',
    sessionAffinity: 'None',
    selector: {
      app: featureStoreName,
      component: 'feature-store',
      'feast.dev/name': featureStoreName,
    },
  },
  status: {
    loadBalancer: {},
  },
});
