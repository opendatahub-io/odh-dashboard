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

export const getServingRuntimeFromTemplate = (template: TemplateKind): ServingRuntimeKind => {
  const servingRuntime = template.objects[0] as ServingRuntimeKind | undefined;
  if (!servingRuntime) {
    throw new Error('Invalid template: no serving runtime');
  } else if (servingRuntime.kind !== 'ServingRuntime') {
    throw new Error(`Invalid template: expected ServingRuntime, got ${servingRuntime.kind}`);
  }
  return servingRuntime;
};
