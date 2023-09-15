import {
  commonFetchText,
  getK8sResourceURL,
  k8sGetResource,
  k8sListResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { PodModel } from '~/api/models';
import { PodKind } from '~/k8sTypes';

export const getPodsForNotebook = (namespace: string, notebookName: string): Promise<PodKind[]> =>
  k8sListResource<PodKind>({
    model: PodModel,
    queryOptions: {
      ns: namespace,
      queryParams: { labelSelector: `notebook-name=${notebookName}` },
    },
  }).then((r) => r.items);

export const getPod = (namespace: string, name: string): Promise<PodKind> =>
  k8sGetResource<PodKind>({
    model: PodModel,
    queryOptions: {
      name,
      ns: namespace,
    },
  });

export const getPodContainerLogText = (
  namespace: string,
  podName: string,
  containerName: string,
  tail?: number,
) =>
  commonFetchText(
    getK8sResourceURL(PodModel, undefined, {
      name: podName,
      ns: namespace,
      path: `log?container=${containerName}${tail ? `&tailLines=${tail}` : ''}`,
    }),
    undefined,
    undefined,
    true,
  );
