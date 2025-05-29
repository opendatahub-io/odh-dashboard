import { k8sListResourceItems } from '@openshift/dynamic-plugin-sdk-utils';
import { ImageStreamModel } from '~/api/models';
import { ImageStreamKind } from '~/k8sTypes';
import { ImageType } from '~/types';

export const listImageStreams = (
  namespace: string,
  type?: ImageType,
): Promise<ImageStreamKind[]> => {
  const labelSelector =
    type === 'byon'
      ? 'app.kubernetes.io/created-by=byon'
      : type === 'jupyter' || type === 'other'
      ? 'opendatahub.io/notebook-image=true'
      : undefined;

  return k8sListResourceItems<ImageStreamKind>({
    model: ImageStreamModel,
    queryOptions: {
      ns: namespace,
      queryParams: {
        ...(labelSelector && { labelSelector }),
      },
    },
  });
};
