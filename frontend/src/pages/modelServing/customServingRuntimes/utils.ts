import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { ServingRuntimeKind, TemplateKind } from '~/k8sTypes';
import { getDisplayNameFromK8sResource } from '~/pages/projects/utils';

export const getTemplateEnabled = (template: TemplateKind) =>
  !(template.metadata.annotations?.['opendatahub.io/template-enabled'] === 'false');

export const isTemplateOOTB = (template: TemplateKind) =>
  template.metadata.labels?.['opendatahub.io/ootb'] === 'true';

export const getSortedTemplates = (templates: TemplateKind[], order: string[]) =>
  [...templates].sort(
    (a, b) =>
      order.indexOf(getServingRuntimeNameFromTemplate(a)) -
      order.indexOf(getServingRuntimeNameFromTemplate(b)),
  );

export const getServingRuntimeDisplayNameFromTemplate = (template: TemplateKind) =>
  getDisplayNameFromK8sResource(template.objects[0]);

export const getServingRuntimeNameFromTemplate = (template: TemplateKind) =>
  template.objects[0].metadata.name;

export const filterTemplatesEnabled = (templates: TemplateKind[]) =>
  templates.filter(getTemplateEnabled);

export const isServingRuntimeKind = (obj: K8sResourceCommon): obj is ServingRuntimeKind =>
  obj.kind === 'ServingRuntime' &&
  obj.spec?.builtInAdapter !== undefined &&
  obj.spec?.containers !== undefined;

export const getServingRuntimeFromTemplate = (template: TemplateKind): ServingRuntimeKind => {
  if (isServingRuntimeKind(template.objects[0])) {
    return template.objects[0];
  } else {
    throw new Error('Invalid Serving Runtime format');
  }
};
