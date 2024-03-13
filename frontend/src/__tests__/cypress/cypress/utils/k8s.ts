import type { K8sModelCommon, K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';

// TODO copying from the dynamic-plugin-sdk-utils
// this is a work around for cypress webpack failing when import code that imports patternfly

const getK8sAPIPath = ({ apiGroup = 'core', apiVersion }: K8sModelCommon) => {
  const isLegacy = apiGroup === 'core' && apiVersion === 'v1';
  return isLegacy ? `/api/${apiVersion}` : `/apis/${apiGroup}/${apiVersion}`;
};

const getK8sResourceURL = (model: K8sModelCommon, resource?: K8sResourceCommon) => {
  let resourcePath = getK8sAPIPath(model);

  if (resource?.metadata?.namespace) {
    resourcePath += `/namespaces/${resource.metadata.namespace}`;
  }

  resourcePath += `/${model.plural}`;

  if (resource?.metadata?.name) {
    resourcePath += `/${encodeURIComponent(resource.metadata.name)}`;
  }

  return resourcePath;
};

export const getK8sWebSocketResourceURL = (
  model: K8sModelCommon,
  resource?: K8sResourceCommon,
): string => `/wss/k8s${getK8sResourceURL(model, resource)}`;

export const getK8sAPIResourceURL = (model: K8sModelCommon, resource?: K8sResourceCommon): string =>
  `/api/k8s${getK8sResourceURL(model, resource)}`;
