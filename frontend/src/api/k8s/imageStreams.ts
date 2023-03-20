import { k8sListResourceItems } from '@openshift/dynamic-plugin-sdk-utils';
import { ImageStreamModel } from '~/api/models';
import { ImageStreamKind } from '~/k8sTypes';

export const getNotebookImageStreams = (namespace: string): Promise<ImageStreamKind[]> =>
  k8sListResourceItems<ImageStreamKind>({
    model: ImageStreamModel,
    queryOptions: {
      ns: namespace,
      queryParams: { labelSelector: 'opendatahub.io/notebook-image=true' },
    },
  });
