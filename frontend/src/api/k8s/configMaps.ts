import {
  k8sCreateResource,
  k8sDeleteResource,
  k8sGetResource,
  k8sUpdateResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { ConfigMapKind, K8sStatus, KnownLabels } from '~/k8sTypes';
import { ConfigMapModel } from '~/api/models';
import { genRandomChars } from '~/utilities/string';

export const assembleConfigMap = (
  projectName: string,
  configMapData: Record<string, string>,
  configMapName?: string,
): ConfigMapKind => ({
  apiVersion: 'v1',
  kind: 'ConfigMap',
  metadata: {
    name: configMapName || `configmap-${genRandomChars()}`,
    namespace: projectName,
    labels: {
      [KnownLabels.DASHBOARD_RESOURCE]: 'true',
    },
  },
  data: configMapData,
});

export const getConfigMap = (projectName: string, configMapName: string): Promise<ConfigMapKind> =>
  k8sGetResource<ConfigMapKind>({
    model: ConfigMapModel,
    queryOptions: { name: configMapName, ns: projectName },
  });

export const createConfigMap = (data: ConfigMapKind): Promise<ConfigMapKind> =>
  k8sCreateResource<ConfigMapKind>({ model: ConfigMapModel, resource: data });

export const replaceConfigMap = (data: ConfigMapKind): Promise<ConfigMapKind> =>
  k8sUpdateResource<ConfigMapKind>({ model: ConfigMapModel, resource: data });

export const deleteConfigMap = (projectName: string, configMapName: string): Promise<K8sStatus> =>
  k8sDeleteResource<ConfigMapKind, K8sStatus>({
    model: ConfigMapModel,
    queryOptions: { name: configMapName, ns: projectName },
  });
