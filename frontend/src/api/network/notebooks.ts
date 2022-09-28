import {
  k8sGetResource,
  k8sListResource,
  k8sPatchResource,
  Patch,
} from '@openshift/dynamic-plugin-sdk-utils';
import { NotebookModel } from '../models';
import { NotebookKind } from '../../k8sTypes';

const startPatch: Patch = {
  op: 'remove',
  path: '/metadata/annotations/kubeflow-resource-stopped',
};
const getStopPatch = (): Patch => ({
  op: 'add',
  path: '/metadata/annotations/kubeflow-resource-stopped',
  value: new Date().toISOString().replace(/\.\d{3}Z/i, 'Z'),
});

export const getNotebooks = (namespace: string): Promise<NotebookKind[]> => {
  return k8sListResource<NotebookKind>({
    model: NotebookModel,
    queryOptions: { ns: namespace },
  }).then((listResource) => listResource.items);
};

export const getNotebook = (name: string, namespace: string): Promise<NotebookKind> => {
  return k8sGetResource<NotebookKind>({
    model: NotebookModel,
    queryOptions: { name, ns: namespace },
  });
};

export const stopNotebook = (name: string, namespace: string): Promise<NotebookKind> => {
  return k8sPatchResource<NotebookKind>({
    model: NotebookModel,
    queryOptions: { name, ns: namespace },
    patches: [getStopPatch()],
  });
};

export const startNotebook = (name: string, namespace: string): Promise<NotebookKind> => {
  return k8sPatchResource<NotebookKind>({
    model: NotebookModel,
    queryOptions: { name, ns: namespace },
    patches: [startPatch],
  });
};
