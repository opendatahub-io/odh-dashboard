import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sUpdateResource,
  K8sStatus,
} from '@openshift/dynamic-plugin-sdk-utils';
import { ConfigMapKind, K8sAPIOptions, KnownLabels } from '#~/k8sTypes';
import { ConfigMapModel } from '#~/api/models';
import { genRandomChars } from '#~/utilities/string';
import { applyK8sAPIOptions } from '#~/api/apiMergeUtils';

export const CONFIGMAP_PREFIX = 'configmap-';

export const getGeneratedConfigMapName = (): string => `${CONFIGMAP_PREFIX}${genRandomChars()}`;
export const isGeneratedConfigMapName = (name: string): boolean =>
  new RegExp(`^${CONFIGMAP_PREFIX}[a-z0-9]{6}$`).test(name);

export const assembleConfigMap = (
  projectName: string,
  configMapData: Record<string, string>,
  configMapName?: string,
): ConfigMapKind => ({
  apiVersion: 'v1',
  kind: 'ConfigMap',
  metadata: {
    name: configMapName || getGeneratedConfigMapName(),
    namespace: projectName,
    labels: {
      [KnownLabels.DASHBOARD_RESOURCE]: 'true',
    },
  },
  data: configMapData,
});

export const getConfigMap = (
  projectName: string,
  configMapName: string,
  opts?: K8sAPIOptions,
): Promise<ConfigMapKind> =>
  k8sGetResource<ConfigMapKind>(
    applyK8sAPIOptions(
      {
        model: ConfigMapModel,
        queryOptions: { name: configMapName, ns: projectName },
      },
      opts,
    ),
  );

export const createConfigMap = (
  data: ConfigMapKind,
  opts?: K8sAPIOptions,
): Promise<ConfigMapKind> =>
  k8sCreateResource<ConfigMapKind>(
    applyK8sAPIOptions({ model: ConfigMapModel, resource: data }, opts),
  );

export const replaceConfigMap = (
  data: ConfigMapKind,
  opts?: K8sAPIOptions,
): Promise<ConfigMapKind> =>
  k8sUpdateResource<ConfigMapKind>(
    applyK8sAPIOptions({ model: ConfigMapModel, resource: data }, opts),
  );

export const deleteConfigMap = (
  projectName: string,
  configMapName: string,
  opts?: K8sAPIOptions,
): Promise<K8sStatus> =>
  k8sDeleteResource<ConfigMapKind, K8sStatus>(
    applyK8sAPIOptions(
      {
        model: ConfigMapModel,
        queryOptions: { name: configMapName, ns: projectName },
      },
      opts,
    ),
  );
