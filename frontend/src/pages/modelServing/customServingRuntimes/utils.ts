import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { ServingRuntimeKind, TemplateKind } from '~/k8sTypes';
import { getDisplayNameFromK8sResource } from '~/pages/projects/utils';
import { ServingRuntimeAPIProtocol, ServingRuntimePlatform } from '~/types';

export const getTemplateEnabled = (
  template: TemplateKind,
  templateDisablement: string[],
): boolean => !templateDisablement.includes(getServingRuntimeNameFromTemplate(template));

export const getTemplateEnabledForPlatform = (
  template: TemplateKind,
  platform: ServingRuntimePlatform,
): boolean => getEnabledPlatformsFromTemplate(template).includes(platform);

export const isTemplateOOTB = (template: TemplateKind): boolean =>
  template.metadata.labels?.['opendatahub.io/ootb'] === 'true';

export const getSortedTemplates = (templates: TemplateKind[], order: string[]): TemplateKind[] =>
  [...templates].sort(
    (a, b) =>
      order.indexOf(getServingRuntimeNameFromTemplate(a)) -
      order.indexOf(getServingRuntimeNameFromTemplate(b)),
  );

export const setListDisabled = (
  template: TemplateKind,
  listTemplates: TemplateKind[],
  templateDisablement: string[],
  isDisabled: boolean,
): string[] => {
  const servingRuntimeName = getServingRuntimeNameFromTemplate(template);
  const templateDisablementFiltered = templateDisablement.filter((item) =>
    listTemplates.find((t) => getServingRuntimeNameFromTemplate(t) === item),
  );
  if (isDisabled) {
    if (!templateDisablementFiltered.includes(servingRuntimeName)) {
      return [...templateDisablementFiltered, servingRuntimeName];
    }
  } else {
    return templateDisablementFiltered.filter((item) => item !== servingRuntimeName);
  }
  return templateDisablementFiltered;
};

export const getServingRuntimeDisplayNameFromTemplate = (template: TemplateKind): string =>
  getDisplayNameFromK8sResource(template.objects[0]);

export const getServingRuntimeNameFromTemplate = (template: TemplateKind): string =>
  template.objects[0].metadata.name;

const createServingRuntimeCustomError = (name: string, message: string): Error => {
  const error = new Error(message);
  error.name = name;
  return error;
};

export const isServingRuntimeKind = (obj: K8sResourceCommon): obj is ServingRuntimeKind => {
  if (obj.kind !== 'ServingRuntime') {
    throw createServingRuntimeCustomError('Invalid parameter', 'kind: must be ServingRuntime.');
  }
  if (!obj.spec?.containers) {
    throw createServingRuntimeCustomError('Missing parameter', 'spec.containers: is required.');
  }
  if (!obj.spec.supportedModelFormats) {
    throw createServingRuntimeCustomError(
      'Missing parameter',
      'spec.supportedModelFormats: is required.',
    );
  }
  return true;
};

export const getServingRuntimeFromName = (
  templateName: string,
  templateList: TemplateKind[] = [],
): ServingRuntimeKind | undefined => {
  const template = templateList.find((t) => getServingRuntimeNameFromTemplate(t) === templateName);
  return getServingRuntimeFromTemplate(template);
};

export const getServingRuntimeFromTemplate = (
  template?: TemplateKind,
): ServingRuntimeKind | undefined => {
  try {
    if (!template || !isServingRuntimeKind(template.objects[0])) {
      return undefined;
    }
  } catch (e) {
    return undefined;
  }

  // Add apiProtocol annotation if exists in template
  const apiProtocolAttribute = 'opendatahub.io/apiProtocol';
  const servingRuntimeObj = { ...template.objects[0] };
  const metadata = { ...template.objects[0].metadata };

  if (metadata.annotations && template.metadata.annotations?.[apiProtocolAttribute]) {
    metadata.annotations[apiProtocolAttribute] =
      template.metadata.annotations[apiProtocolAttribute];
  }

  servingRuntimeObj.metadata = metadata;

  return servingRuntimeObj;
};

export const getDisplayNameFromServingRuntimeTemplate = (resource: ServingRuntimeKind): string => {
  const templateName =
    resource.metadata.annotations?.['opendatahub.io/template-display-name'] ||
    resource.metadata.annotations?.['opendatahub.io/template-name'];
  const legacyTemplateName =
    resource.spec.builtInAdapter?.serverType === 'ovms' ? 'OpenVINO Model Server' : undefined;

  return templateName || legacyTemplateName || 'Unknown Serving Runtime';
};

export const getEnabledPlatformsFromTemplate = (
  template: TemplateKind,
): ServingRuntimePlatform[] => {
  if (!template.metadata.annotations?.['opendatahub.io/modelServingSupport']) {
    // By default, old Custom Serving Runtimes with no annotation will only be supported in modelmesh
    return [ServingRuntimePlatform.MULTI];
  }

  try {
    const platforms = JSON.parse(
      template.metadata.annotations['opendatahub.io/modelServingSupport'],
    );
    if (platforms.length === 0) {
      return [ServingRuntimePlatform.MULTI];
    }
    return platforms;
  } catch (e) {
    return [ServingRuntimePlatform.MULTI];
  }
};

export const getAPIProtocolFromTemplate = (
  template: TemplateKind,
): ServingRuntimeAPIProtocol | undefined => {
  if (!template.metadata.annotations?.['opendatahub.io/apiProtocol']) {
    return undefined;
  }

  return template.metadata.annotations['opendatahub.io/apiProtocol'] as ServingRuntimeAPIProtocol;
};

export const getAPIProtocolFromServingRuntime = (
  resource: ServingRuntimeKind,
): ServingRuntimeAPIProtocol | undefined => {
  if (!resource.metadata.annotations?.['opendatahub.io/apiProtocol']) {
    return undefined;
  }
  return resource.metadata.annotations['opendatahub.io/apiProtocol'] as ServingRuntimeAPIProtocol;
};
