import { k8sGetResource } from '@openshift/dynamic-plugin-sdk-utils';
import { ConfigMapModel } from './models';
import { applyK8sAPIOptions } from '../index';
import type { ConfigMapKind, K8sAPIOptions } from '../k8sTypes';

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
