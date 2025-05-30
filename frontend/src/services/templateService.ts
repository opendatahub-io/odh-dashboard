// TODO: Delete once we refactor Admin panel to support Passthrough API
import YAML from 'yaml';
import axios from '#~/utilities/axios';
import { assembleServingRuntimeTemplate } from '#~/api';
import { ServingRuntimeKind, TemplateKind } from '#~/k8sTypes';
import { ServingRuntimeAPIProtocol, ServingRuntimePlatform } from '#~/types';
import { addTypesToK8sListedResources } from '#~/utilities/addTypesToK8sListedResources';

export const listTemplatesBackend = async (
  namespace: string,
  labelSelector?: string,
): Promise<TemplateKind[]> =>
  axios
    .get(`/api/templates/${namespace}`, { params: { labelSelector } })
    .then((response) => addTypesToK8sListedResources<TemplateKind>(response.data, 'Template').items)
    .catch((e) => Promise.reject(e));

const dryRunServingRuntimeForTemplateCreationBackend = (
  servingRuntime: ServingRuntimeKind,
  namespace: string,
): Promise<ServingRuntimeKind> =>
  axios
    .post(
      '/api/servingRuntimes/',
      { ...servingRuntime, metadata: { ...servingRuntime.metadata, namespace } },
      { params: { dryRun: 'All' } },
    )
    .then((response) => response.data)
    .catch((e) => Promise.reject(e));

export const createServingRuntimeTemplateBackend = async (
  body: string,
  namespace: string,
  platforms: ServingRuntimePlatform[],
  apiProtocol: ServingRuntimeAPIProtocol | undefined,
): Promise<TemplateKind> => {
  try {
    const template = assembleServingRuntimeTemplate(body, namespace, platforms, apiProtocol);
    const servingRuntime = template.objects[0];
    const servingRuntimeName = servingRuntime.metadata.name;

    // make sure the serving runtime name is not duplicated
    const templates = await listTemplatesBackend(namespace, 'opendatahub.io/dashboard=true');
    if (templates.find((t) => t.objects[0].metadata.name === servingRuntimeName)) {
      throw new Error(`Serving runtime name "${servingRuntimeName}" already exists.`);
    }
    return await dryRunServingRuntimeForTemplateCreationBackend(servingRuntime, namespace).then(
      () =>
        axios
          .post('/api/templates/', template)
          .then((response) => response.data)
          .catch((e) => {
            throw new Error(e.response.data.message);
          }),
    );
  } catch (e) {
    return Promise.reject(e);
  }
};

export const updateServingRuntimeTemplateBackend = (
  existingTemplate: TemplateKind,
  body: string,
  namespace: string,
  platforms: ServingRuntimePlatform[],
  apiProtocol: ServingRuntimeAPIProtocol | undefined,
): Promise<TemplateKind> => {
  try {
    const { name } = existingTemplate.metadata;
    const servingRuntimeName = existingTemplate.objects[0].metadata.name;
    const servingRuntime: ServingRuntimeKind = YAML.parse(body);
    if (!servingRuntime.metadata.name) {
      throw new Error('Serving runtime name is required.');
    }
    if (servingRuntime.metadata.name !== servingRuntimeName) {
      throw new Error(
        `Cannot change serving runtime name (original: "${servingRuntimeName}", updated: "${servingRuntime.metadata.name}").`,
      );
    }
    return dryRunServingRuntimeForTemplateCreationBackend(servingRuntime, namespace).then(() =>
      axios
        .patch<TemplateKind>(`/api/templates/${namespace}/${name}`, [
          {
            op: 'replace',
            path: '/objects/0',
            value: servingRuntime,
          },
          existingTemplate.metadata.annotations?.['opendatahub.io/modelServingSupport']
            ? {
                op: 'replace',
                path: '/metadata/annotations/opendatahub.io~1modelServingSupport',
                value: JSON.stringify(platforms),
              }
            : {
                op: 'add',
                path: '/metadata/annotations',
                value: {
                  'opendatahub.io/modelServingSupport': JSON.stringify(platforms),
                },
              },
          existingTemplate.metadata.annotations?.['opendatahub.io/apiProtocol']
            ? {
                op: 'replace',
                path: '/metadata/annotations/opendatahub.io~1apiProtocol',
                value: apiProtocol,
              }
            : {
                op: 'add',
                path: '/metadata/annotations',
                value: {
                  ...(apiProtocol && { 'opendatahub.io/apiProtocol': apiProtocol }),
                },
              },
        ])
        .then((response) => response.data),
    );
  } catch (e) {
    return Promise.reject(e);
  }
};

export const deleteTemplateBackend = (name: string, namespace: string): Promise<TemplateKind> =>
  axios
    .delete(`/api/templates/${namespace}/${name}`)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
