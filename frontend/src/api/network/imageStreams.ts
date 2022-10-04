import { k8sListResource } from '@openshift/dynamic-plugin-sdk-utils';
import { ImageStreamModel } from '../models';
import { ImageStreamKind } from '../../k8sTypes';

export const getImageStreams = (namespace: string): Promise<ImageStreamKind[]> => {
  return k8sListResource<ImageStreamKind>({
    model: ImageStreamModel,
    queryOptions: {
      ns: namespace,
      queryParams: { labelSelector: 'opendatahub.io/notebook-image=true' },
    },
  }).then((r) => r.items);
};
