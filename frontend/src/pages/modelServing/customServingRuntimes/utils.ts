import { ServingRuntimeKind, TemplateKind } from '~/k8sTypes';
import { getDisplayNameFromK8sResource } from '~/pages/projects/utils';

export const compareServingRuntimeKinds =
  (metadataNameOrder: string[]) => (a: ServingRuntimeKind, b: ServingRuntimeKind) => {
    const aIndex = metadataNameOrder.indexOf(a.metadata.name);
    const bIndex = metadataNameOrder.indexOf(b.metadata.name);

    return aIndex - bIndex;
  };

export const getTemplateEnabled = (template: TemplateKind) =>
  !(template.metadata.annotations?.['opendatahub.io/template-enabled'] === 'false');

export const getDragItemOrder = (servingRuntimes: ServingRuntimeKind[], order: string[]) =>
  servingRuntimes
    .sort(compareServingRuntimeKinds(order))
    .map((servingRuntime) => servingRuntime.metadata.name);

export const getServingRuntimeDisplayNameFromTemplate = (template: TemplateKind) =>
  getDisplayNameFromK8sResource(template.objects[0]);

export const getServingRuntimeNameFromTemplate = (template: TemplateKind) =>
  template.objects[0].metadata.name;

export const isServingRuntimeKind = (object: unknown): object is ServingRuntimeKind =>
  (object as ServingRuntimeKind).kind === 'ServingRuntime';
