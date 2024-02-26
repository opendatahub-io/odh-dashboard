import YAML from 'yaml';
import { k8sDeleteResource, k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { ServingRuntimeKind, TemplateKind } from '~/k8sTypes';
import { TemplateModel } from '~/api/models';
import { genRandomChars } from '~/utilities/string';
import { ServingRuntimePlatform } from '~/types';

export const assembleServingRuntimeTemplate = (
  body: string,
  namespace: string,
  platforms: ServingRuntimePlatform[],
  templateName?: string,
): TemplateKind & { objects: ServingRuntimeKind[] } => {
  const servingRuntime: ServingRuntimeKind = YAML.parse(body);
  const name = `template-${genRandomChars()}`;
  const servingRuntimeName = servingRuntime.metadata.name;

  if (!servingRuntimeName) {
    throw new Error('Serving runtime name is required');
  }

  return {
    kind: 'Template',
    apiVersion: 'template.openshift.io/v1',
    metadata: {
      name: templateName || name,
      namespace,
      labels: {
        'opendatahub.io/dashboard': 'true',
      },
      annotations: {
        'opendatahub.io/modelServingSupport': JSON.stringify(platforms),
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

export const deleteTemplate = (name: string, namespace: string): Promise<TemplateKind> =>
  k8sDeleteResource<TemplateKind>({
    model: TemplateModel,
    queryOptions: { name, ns: namespace },
  });
