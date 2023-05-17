import { StatusResponse } from '~/redux/types';

export const mockStatus = (): StatusResponse => ({
  kube: {
    currentContext: 'opendatahub/admin-user-datahub-redhat-com:6443/admin-user',
    currentUser: {
      name: 'admin-user/api-admin-user-dev-datahub-redhat-com:6443',
      token: 'sha256~9iRWHnXnoQusPNr11Hda_rqwerfasdfQWERasdfasdf',
    },
    namespace: 'opendatahub',
    userName: 'admin-user',
    clusterID: '16855612-2bb7-4a4c-9ff0-72rasdfd5',
    clusterBranding: 'ocp',
    isAdmin: true,
    isAllowed: true,
    serverURL: 'https://api.admin-user.dev.datahub.redhat.com:6443',
  },
});
