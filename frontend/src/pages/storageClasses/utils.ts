import { MetadataAnnotation, StorageClassConfig, StorageClassKind } from '~/k8sTypes';

export const getStorageClassConfig = (
  storageClass: StorageClassKind,
): StorageClassConfig | undefined => {
  const storageClassConfig: StorageClassConfig | undefined = JSON.parse(
    storageClass.metadata.annotations?.[MetadataAnnotation.OdhStorageClassConfig] || '',
  );

  return storageClassConfig;
};

export const isOpenshiftDefaultStorageClass = (storageClass: StorageClassKind): boolean =>
  storageClass.metadata.annotations?.[MetadataAnnotation.StorageClassIsDefault] === 'true';
