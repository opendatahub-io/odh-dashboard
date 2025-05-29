import { StatusResponse } from '#~/redux/types';

export const mockStatus = (options?: {
  isAdmin?: boolean;
  isAllowed?: boolean;
}): StatusResponse => ({
  kube: {
    currentContext: 'test-user/api-test-user-dev-datahub-redhat-com:6443',
    currentUser: {
      name: 'inClusterUser',
      token: 'test-token-value',
    },
    namespace: 'opendatahub',
    userName: 'test-user',
    userID: '1234',
    clusterID: '16855612-2bb7-4a4c-9ff0-72rasdfd5',
    clusterBranding: 'ocp',
    isAdmin: options?.isAdmin ?? false,
    isAllowed: options?.isAllowed ?? true,
    serverURL: 'https://api.test-user.dev.datahub.redhat.com:6443',
  },
});
