import YAML from 'yaml';
import {
  k8sCreateResource,
  k8sListResource,
  k8sPatchResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { ServingRuntimeKind, TemplateKind } from '~/k8sTypes';
import { ServingRuntimeModel, TemplateModel } from '~/api/models';
import { applyK8sAPIOptions } from '~/api/apiMergeUtils';

export const assembleTemplate = (body: string, namespace: string): TemplateKind => {
  const servingRuntime = YAML.parse(body);

  const displayName = servingRuntime.metadata?.annotations?.['display-name'];
  const name = servingRuntime.metadata?.name;

  return {
    kind: 'Template',
    apiVersion: 'template.openshift.io/v1',
    metadata: {
      name: name || displayName || '',
      namespace,
      labels: {
        'opendatahub.io/dashboard': 'true',
      },
      annotations: {
        description: 'ONNX ServingRuntiem Definition',
        'opendatahub.io/template-enabled': 'true',
        tags: `${name},servingruntime`,
      },
    },
    objects: [servingRuntime],
    parameters: [],
  };
};

export const listTemplates = async (
  namespace?: string,
  labelSelector?: string,
): Promise<TemplateKind[]> => {
  const queryOptions = {
    ...(namespace && { ns: namespace }),
    ...(labelSelector && { queryParams: { labelSelector } }),
  };
  return k8sListResource<TemplateKind>({
    model: TemplateModel,
    queryOptions,
  }).then((listResource) => listResource.items);
};

export const toggleTemplateEnabledStatus = (
  name: string,
  namespace: string,
  enable: boolean,
): Promise<TemplateKind> =>
  k8sPatchResource<TemplateKind>({
    model: TemplateModel,
    queryOptions: { name, ns: namespace },
    patches: [
      {
        op: 'replace',
        path: '/metadata/annotations/opendatahub.io~1template-enabled',
        value: enable ? 'true' : 'false',
      },
    ],
  });

export const createServingRuntimeTemplate = (
  body: string,
  namespace: string,
): Promise<TemplateKind> => {
  try {
    const template = assembleTemplate(body, namespace);
    const servingRuntime = template.objects[0] as ServingRuntimeKind;

    return k8sCreateResource<ServingRuntimeKind>(
      applyK8sAPIOptions(
        { dryRun: true },
        {
          model: ServingRuntimeModel,
          resource: { ...servingRuntime, metadata: { ...servingRuntime.metadata, namespace } },
        },
      ),
    ).then(() =>
      k8sCreateResource<TemplateKind>({
        model: TemplateModel,
        resource: template,
      }),
    );
  } catch (e) {
    return Promise.reject(e);
  }
};
