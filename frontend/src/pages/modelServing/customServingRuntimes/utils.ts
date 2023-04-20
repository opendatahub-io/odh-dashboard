import { TemplateKind } from '~/k8sTypes';

export const compareTemplateKinds =
  (metadataNameOrder: string[]) => (a: TemplateKind, b: TemplateKind) => {
    const aIndex = metadataNameOrder.indexOf(a.metadata.name);
    const bIndex = metadataNameOrder.indexOf(b.metadata.name);

    if (aIndex > bIndex) {
      return 1;
    } else if (aIndex < bIndex) {
      return -1;
    }
    return 0;
  };

export const getTemplateEnabled = (template: TemplateKind) =>
  !(template.metadata.annotations?.['opendatahub.io/template-enabled'] === 'false');
