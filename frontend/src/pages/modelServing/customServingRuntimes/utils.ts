import { TemplateKind } from '~/k8sTypes';
import { getDisplayNameFromK8sResource } from '~/pages/projects/utils';

export const getTemplateEnabled = (template: TemplateKind) =>
  !(template.metadata.annotations?.['opendatahub.io/template-enabled'] === 'false');

export const getDragItemOrder = (templates: TemplateKind[], order: string[]) =>
  templates
    .map((template) => template.objects[0].metadata.name)
    .sort((a, b) => order.indexOf(a) - order.indexOf(b));

export const getServingRuntimeDisplayNameFromTemplate = (template: TemplateKind) =>
  getDisplayNameFromK8sResource(template.objects[0]);

export const getServingRuntimeNameFromTemplate = (template: TemplateKind) =>
  template.objects[0].metadata.name;
