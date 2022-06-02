import * as fs from 'fs';
import * as path from 'path';
import * as jsYaml from 'js-yaml';
import { yamlRegExp } from '../../../utils/constants';
import {
     KubeFastifyInstance,
     Notebook, NotebookList, NotebookRequest, NotebookResources } from '../../../types';
import { getComponentFeatureFlags } from '../../../utils/features';
import fastify from 'fastify';
import { PatchUtils } from '@kubernetes/client-node';

export const getNotebooks = async (fastify: KubeFastifyInstance, namespace: string, labels: string): Promise<NotebookList> => {
    const kubeResponse = await fastify.kube.customObjectsApi.listNamespacedCustomObject(
        'kubeflow.org',
        'v1',
        namespace,
        'notebooks',
        undefined,
        undefined,
        undefined,
        labels,
      );
    return kubeResponse.body as NotebookList;
};

export const getNotebook = async (fastify: KubeFastifyInstance, namespace: string, notebookName: string): Promise<Notebook> => {
    const kubeResponse = await fastify.kube.customObjectsApi.getNamespacedCustomObject(
        'kubeflow.org',
        'v1',
        namespace,
        'notebooks',
        notebookName,
      );
    return kubeResponse.body as Notebook;
};

export const verifyResources = (resources: NotebookResources): NotebookResources => {

    if (resources.requests && !resources.limits) {
        resources.limits = resources.requests;
    };

    //TODO: verify if resources can fit on node

    return resources;
}

export const postNotebook = async (fastify: KubeFastifyInstance, namespace: string, notebookRequest: NotebookRequest): Promise<Notebook> => {
  const notebookData: Notebook = {
      apiVersion: 'kubeflow.org/v1',
      kind: 'Notebook',
      metadata: {
          name: notebookRequest.name,
          namespace: namespace,
          labels: notebookRequest?.labels,
          annotations: { ...notebookRequest?.annotations, ...{'notebooks.opendatahub.io/inject-oauth': 'true'}},
      },
      spec: {
          template: {
              spec: {
                  containers: [
                      {
                          name: notebookRequest.name, //Has to be same as notebook name
                          image: notebookRequest.image,
                          imagePullPolicy: 'Always',
                          workingDir: '/opt/app-root/src',
                          env: {
                                ...notebookRequest?.env,
                                ...[
                                        {name: "JUPYTER_NOTEBOOK_PORT", value:"8888"},
                                        {name:"NOTEBOOK_ARGS", value: "--NotebookApp.token='' --NotebookApp.password=''"},
                                  ]
                              }, //TODO: Gather from secrets
                          resources: verifyResources(notebookRequest.resources)//Should not be optional to prevent unlimited resources
                      },
                  ],
              },
          },
      },
  }

  
  const createNotebookResponse = await fastify.kube.customObjectsApi.createNamespacedCustomObject(
    'kubeflow.org',
    'v1',
    namespace,
    'notebooks',
    notebookData,
  );

  return createNotebookResponse.body as Notebook;
};

export const patchNotebook =async (fastify: KubeFastifyInstance, request: { stopped: boolean } | any, namespace: string, notebookName: string): Promise<Notebook> => {
    let patch;
        const options = {
          headers: { 'Content-type': PatchUtils.PATCH_FORMAT_JSON_MERGE_PATCH },
        };
        if (request.stopped) {
          const dateStr = new Date().toISOString().replace(/\.\d{3}Z/i, 'Z');
          patch = { metadata: { annotations: { 'kubeflow-resource-stopped': dateStr } } };
        } else if (request.stopped === false) {
          patch = { metadata: { annotations: { 'kubeflow-resource-stopped': null } } };
        } else {
          patch = request;
        }
  
        const kubeResponse = await fastify.kube.customObjectsApi.patchNamespacedCustomObject(
          'kubeflow.org',
          'v1',
          namespace,
          'notebooks',
          notebookName,
          patch,
          undefined,
          undefined,
          undefined,
          options,
        );
        return kubeResponse.body as Notebook;
}
