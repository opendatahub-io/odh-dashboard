import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { PodModel } from '../models';
import { PodKind } from '../../k8sTypes';

export const getPodsForNotebook = (namespace: string, notebookName: string): Promise<PodKind[]> => {
  return k8sListResource<PodKind>({
    model: PodModel,
    queryOptions: {
      ns: namespace,
      queryParams: { labelSelector: `notebook-name=${notebookName}` },
    },
  }).then((r) => r.items);
};
