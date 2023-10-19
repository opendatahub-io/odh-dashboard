import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { ServingRuntimeKind, TemplateKind } from '~/k8sTypes';
import { getDisplayNameFromK8sResource } from '~/pages/projects/utils';
import { ServingRuntimePlatform } from '~/types';

export const getTemplateEnabled = (template: TemplateKind, templateDisablement: string[]) =>
  !templateDisablement.includes(getServingRuntimeNameFromTemplate(template));

export const isTemplateOOTB = (template: TemplateKind) =>
  template.metadata.labels?.['opendatahub.io/ootb'] === 'true';

export const getSortedTemplates = (templates: TemplateKind[], order: string[]) =>
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

export const getServingRuntimeDisplayNameFromTemplate = (template: TemplateKind) =>
  getDisplayNameFromK8sResource(template.objects[0]);

export const getServingRuntimeNameFromTemplate = (template: TemplateKind) =>
  template.objects[0].metadata.name;

const createServingRuntimeCustomError = (name: string, message: string) => {
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
  if (!obj.spec?.supportedModelFormats) {
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
  return template.objects[0];
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
    return [ServingRuntimePlatform.SINGLE, ServingRuntimePlatform.MULTI];
  }

  try {
    return JSON.parse(template.metadata.annotations?.['opendatahub.io/modelServingSupport']);
  } catch (e) {
    return [ServingRuntimePlatform.SINGLE, ServingRuntimePlatform.MULTI];
  }
};
