import { createK8sApi } from '@odh-dashboard/autox-core/ui/api';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';

export const k8sApi = createK8sApi(URL_PREFIX, BFF_API_VERSION);
export const { getUser, getNamespaces, getSecrets } = k8sApi;
