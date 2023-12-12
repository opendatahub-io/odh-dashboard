import { k8sGetResource, k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { PipelineKind } from '~/k8sTypes';
import { PipelineModel } from '~/api/models';

export const listK8sPipelinesByLabel = async (
  namespace: string,
  label: string,
): Promise<PipelineKind[]> =>
  k8sListResource<PipelineKind>({
    model: PipelineModel,
    queryOptions: {
      ns: namespace,
      queryParams: { labelSelector: label },
    },
  }).then((listResource) => listResource.items);

export const getK8sPipeline = (name: string, namespace: string): Promise<PipelineKind> =>
  k8sGetResource<PipelineKind>({
    model: PipelineModel,
    queryOptions: { name, ns: namespace },
  });
