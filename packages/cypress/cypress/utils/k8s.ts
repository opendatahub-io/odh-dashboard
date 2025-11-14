import {
  type K8sModelCommon,
  type K8sResourceCommon,
  type QueryParams,
} from '@openshift/dynamic-plugin-sdk-utils';
import { isEmpty } from 'lodash-es';

export type QueryOptions = {
  ns?: string;
  name?: string;
  path?: string;
  queryParams?: {
    [key: string]: string;
  };
};

export const getK8sWebSocketResourceURL = (
  model: K8sModelCommon,
  queryOptions?: QueryOptions,
): string =>
  `/wss/k8s${getK8sResourceURL(model, undefined, {
    ...queryOptions,
    queryParams: { watch: 'true', ...queryOptions?.queryParams },
  })}`;

export const getK8sAPIResourceURL = (
  model: K8sModelCommon,
  resource?: K8sResourceCommon,
  queryOptions?: QueryOptions,
  isCreate = false,
): string => `/api/k8s${getK8sResourceURL(model, resource, queryOptions, isCreate)}`;

// ------------------------------------------------------------------------------------------
// FIXME copying from the dynamic-plugin-sdk-utils
// this is a work around for cypress webpack failing when import code that imports patternfly

const getK8sAPIPath = ({ apiGroup = 'core', apiVersion }: K8sModelCommon) => {
  let path = '';
  const isLegacy = apiGroup === 'core' && apiVersion === 'v1';
  path += isLegacy ? `/api/${apiVersion}` : `/apis/${apiGroup}/${apiVersion}`;
  return path;
};

const getQueryString = (queryParams: QueryParams) =>
  Object.entries(queryParams)
    .map(([key, value = '']) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');

const getK8sResourceURL = (
  model: K8sModelCommon,
  resource?: K8sResourceCommon,
  queryOptions: QueryOptions = {},
  isCreate = false,
) => {
  const { ns, name, path, queryParams } = queryOptions;
  let resourcePath = getK8sAPIPath(model);

  if (resource?.metadata?.namespace) {
    resourcePath += `/namespaces/${resource.metadata.namespace}`;
  } else if (ns) {
    resourcePath += `/namespaces/${ns}`;
  }

  if (resource?.metadata?.namespace && ns && resource.metadata.namespace !== ns) {
    throw new Error('Resource payload namespace vs. query options namespace mismatch');
  }

  resourcePath += `/${model.plural}`;

  if (!isCreate) {
    if (resource?.metadata?.name) {
      resourcePath += `/${encodeURIComponent(resource.metadata.name)}`;
    } else if (name) {
      resourcePath += `/${encodeURIComponent(name)}`;
    }
  }

  if (resource?.metadata?.name && name && resource.metadata.name !== name) {
    throw new Error('Resource payload name vs. query options name mismatch');
  }

  if (path) {
    resourcePath += `/${path}`;
  }

  const filteredQueryParams = queryParams;

  if (filteredQueryParams && !isEmpty(filteredQueryParams)) {
    resourcePath += `?${getQueryString(filteredQueryParams)}`;
  }

  return resourcePath;
};
