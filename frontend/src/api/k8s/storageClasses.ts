import {
  k8sGetResource,
  k8sListResource,
  k8sPatchResource,
  Patch,
} from '@openshift/dynamic-plugin-sdk-utils';
import {
  K8sAPIOptions,
  MetadataAnnotation,
  StorageClassConfig,
  StorageClassKind,
} from '~/k8sTypes';
import { StorageClassModel } from '~/api/models';
import { applyK8sAPIOptions } from '~/api/apiMergeUtils';

export const getStorageClasses = (): Promise<StorageClassKind[]> =>
  k8sListResource<StorageClassKind>({
    model: StorageClassModel,
    queryOptions: {},
  }).then((listResource) => listResource.items);

export const getStorageClass = (name: string): Promise<StorageClassKind> =>
  k8sGetResource<StorageClassKind>({
    model: StorageClassModel,
    queryOptions: { name },
  });

export const updateStorageClassConfig = async (
  name: string,
  config: Partial<StorageClassConfig> | undefined,
  opts?: K8sAPIOptions,
): Promise<StorageClassConfig> => {
  const oldStorageClassResource = await getStorageClass(name);
  const patches: Patch[] = [
    {
      op: 'replace',
      path: '/metadata/annotations/opendatahub.io~1sc-config',
      value: config
        ? JSON.stringify({
            ...(oldStorageClassResource.metadata.annotations?.[
              MetadataAnnotation.OdhStorageClassConfig
            ] &&
              JSON.parse(
                oldStorageClassResource.metadata.annotations[
                  MetadataAnnotation.OdhStorageClassConfig
                ],
              )),
            ...config,
            lastModified: new Date().toISOString(),
          })
        : '',
    },
  ];
  return k8sPatchResource(
    applyK8sAPIOptions(
      {
        model: StorageClassModel,
        queryOptions: {
          name,
        },
        patches,
      },
      opts,
    ),
  ).then((storageClass) =>
    JSON.parse(
      storageClass.metadata?.annotations?.[MetadataAnnotation.OdhStorageClassConfig] ?? '',
    ),
  );
};
