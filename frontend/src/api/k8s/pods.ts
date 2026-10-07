import {
  commonFetch,
  getK8sResourceURL,
  k8sGetResource,
  k8sListResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { applyK8sAPIOptions, type K8sAPIOptions, type PodKind } from '@odh-dashboard/k8s-core';
import { PodModel } from '@odh-dashboard/k8s-core/api/models';

export const getPodsForNotebook = (
  namespace: string,
  notebookName: string,
  opts?: K8sAPIOptions,
): Promise<PodKind[]> =>
  k8sListResource<PodKind>(
    applyK8sAPIOptions(
      {
        model: PodModel,
        queryOptions: {
          ns: namespace,
          queryParams: { labelSelector: `notebook-name=${notebookName}` },
        },
      },
      opts,
    ),
  ).then((r) => r.items);

export const getPod = (namespace: string, name: string): Promise<PodKind> =>
  k8sGetResource<PodKind>({
    model: PodModel,
    queryOptions: {
      name,
      ns: namespace,
    },
  });

export const getPodContainerLogText = async (
  namespace: string,
  podName: string,
  containerName: string,
  tail?: number,
): Promise<string> => {
  const response = await commonFetch(
    getK8sResourceURL(PodModel, undefined, {
      name: podName,
      ns: namespace,
      path: `log?container=${containerName}${tail ? `&tailLines=${tail}` : ''}`,
    }),
    { headers: { Accept: 'text/plain, application/json' } },
    undefined,
    true,
  );

  return response.text();
};

export const getPodsForKserve = (namespace: string, modelName: string): Promise<PodKind[]> =>
  k8sListResource<PodKind>({
    model: PodModel,
    queryOptions: {
      ns: namespace,
      queryParams: { labelSelector: `serving.kserve.io/inferenceservice=${modelName}` },
    },
  }).then((r) => r.items);
