import { createK8sApi } from '@odh-dashboard/autox-core/ui/api';
import { BFF_API_VERSION, URL_PREFIX } from '~/app/utilities/const';

export const { getUser, getNamespaces, getSecrets } = createK8sApi(URL_PREFIX, BFF_API_VERSION);
