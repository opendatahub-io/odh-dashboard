// TODO: Delete once we refactor Admin panel to support Passthrough API
import axios from 'axios';
import YAML from 'yaml';
import { assembleServingRuntimeTemplate } from '~/api';
import { ServingRuntimeKind, TemplateKind } from '~/k8sTypes';

export const listTemplatesBackend = async (
  namespace?: string,
  labelSelector?: string,
): Promise<TemplateKind[]> =>
  axios
    .get(`/api/templates/${namespace}`, { params: { labelSelector } })
    .then((response) => response.data.items)
    .catch((e) => Promise.reject(e));

export const toggleTemplateEnabledStatusBackend = (
  name: string,
  namespace: string,
  enable: boolean,
): Promise<TemplateKind> =>
  axios
    .patch<TemplateKind>(`/api/templates/${namespace}/${name}`, [
      {
        op: 'replace',
        path: '/metadata/annotations/opendatahub.io~1template-enabled',
        value: enable ? 'true' : 'false',
      },
    ])
    .then((response) => response.data)
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
): Promise<TemplateKind> => {
  try {
    const template = assembleServingRuntimeTemplate(body, namespace);
    const servingRuntime = template.objects[0];
    const servingRuntimeName = servingRuntime.metadata.name;

    // make sure the serving runtime name is not duplicated
    const templates = await listTemplatesBackend(namespace, 'opendatahub.io/dashboard=true');
    if (templates.find((t) => t.objects[0].metadata.name === servingRuntimeName)) {
      throw new Error(`Serving runtime name "${servingRuntimeName}" already exists.`);
    }
    return dryRunServingRuntimeForTemplateCreationBackend(servingRuntime, namespace).then(() =>
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
  name: string,
  servingRuntimeName: string,
  body: string,
  namespace: string,
): Promise<TemplateKind> => {
  try {
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
