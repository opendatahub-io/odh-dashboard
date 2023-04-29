import { TemplateKind } from '~/k8sTypes';
import { getDisplayNameFromK8sResource } from '~/pages/projects/utils';

export const getTemplateEnabled = (template: TemplateKind) =>
  !(template.metadata.annotations?.['opendatahub.io/template-enabled'] === 'false');

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
