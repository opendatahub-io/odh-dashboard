import { TemplateKind } from '~/k8sTypes';
import { getDisplayNameFromK8sResource } from '~/pages/projects/utils';

export const compareTemplateKinds =
  (metadataNameOrder: string[]) => (a: TemplateKind, b: TemplateKind) => {
    const aIndex = metadataNameOrder.indexOf(a.metadata.name);
    const bIndex = metadataNameOrder.indexOf(b.metadata.name);

    return aIndex - bIndex;
  };

export const getTemplateEnabled = (template: TemplateKind) =>
  !(template.metadata.annotations?.['opendatahub.io/template-enabled'] === 'false');

export const getDragItemOrder = (templates: TemplateKind[], templateOrder: string[]) =>
  templates.sort(compareTemplateKinds(templateOrder)).map((template) => template.metadata.name);

export const getTemplateDisplayName = (template: TemplateKind) =>
  getDisplayNameFromK8sResource(template);
