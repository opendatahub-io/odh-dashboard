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
} from '#~/k8sTypes';
import { StorageClassModel } from '#~/api/models';
import { applyK8sAPIOptions } from '#~/api/apiMergeUtils';

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

const getStorageClassUpdateValue = (config: Partial<StorageClassConfig>, oldConfig?: string) => {
  try {
    return JSON.stringify({
      ...(oldConfig && JSON.parse(oldConfig)),
      ...config,
      lastModified: new Date().toISOString(),
    });
  } catch (e) {
    return JSON.stringify({
      ...config,
      lastModified: new Date().toISOString(),
    });
  }
};

export const updateStorageClassConfig = async (
  name: string,
  config: Partial<StorageClassConfig> | undefined,
  opts?: K8sAPIOptions,
): Promise<StorageClassConfig> => {
  const oldStorageClassResource = await getStorageClass(name);
  const oldConfig =
    oldStorageClassResource.metadata.annotations?.[MetadataAnnotation.OdhStorageClassConfig];
  const patches: Patch[] = [];
  if (!oldStorageClassResource.metadata.annotations) {
    patches.push({
      op: 'add',
      path: '/metadata/annotations',
      value: {},
    });
  }
  patches.push({
    op: oldConfig ? 'replace' : 'add',
    path: '/metadata/annotations/opendatahub.io~1sc-config',
    value: config ? getStorageClassUpdateValue(config, oldConfig) : '',
  });

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
