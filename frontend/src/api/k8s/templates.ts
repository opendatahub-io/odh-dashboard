import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { TemplateKind } from '~/k8sTypes';
import { TemplateModel } from '~/api/models';

export const listTemplates = (
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
