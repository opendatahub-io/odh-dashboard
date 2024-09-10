import { MetadataAnnotation, StorageClassConfig, StorageClassKind } from '~/k8sTypes';

export const getStorageClassConfig = (
  storageClass: StorageClassKind,
): StorageClassConfig | undefined => {
  try {
    const storageClassConfig: StorageClassConfig | undefined = JSON.parse(
      storageClass.metadata.annotations?.[MetadataAnnotation.OdhStorageClassConfig] || '',
    );

    return storageClassConfig;
  } catch {
    return undefined;
  }
};

export const isOpenshiftDefaultStorageClass = (storageClass: StorageClassKind): boolean =>
  storageClass.metadata.annotations?.[MetadataAnnotation.StorageClassIsDefault] === 'true';

export const getDefaultStorageClass = (
  storageClasses: StorageClassKind[],
): StorageClassKind | undefined =>
  storageClasses.find(
    (storageClass) =>
      isOpenshiftDefaultStorageClass(storageClass) ||
      getStorageClassConfig(storageClass)?.isDefault,
  );
