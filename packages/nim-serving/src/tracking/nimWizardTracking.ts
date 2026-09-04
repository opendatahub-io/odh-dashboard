import type { WizardFormData } from '@odh-dashboard/model-serving/shared/types/form-data';
import type { NIMImage } from '../api/images/types';
import { getImageRepository, normalizeVersion } from '../api/images/utils';
import type { NIMImageFieldValue } from '../pages/deploymentWizard/fields/NIMImageField';
import {
  NIMPVCStorageMode,
  type NIMPVCFieldValue,
} from '../pages/deploymentWizard/fields/NIMPVCField';
import { NIM_IMAGE_FIELD_ID, NIM_PVC_STORAGE_FIELD_ID } from '../constants';

type TrackingProperties = Record<string, string | number | boolean | undefined>;

type ExternalDataMap = Record<string, { data: unknown }>;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isNIMImageFieldValue = (value: unknown): value is NIMImageFieldValue =>
  isRecord(value) && typeof value.repository === 'string' && typeof value.tag === 'string';

const isNIMPVCFieldValue = (value: unknown): value is NIMPVCFieldValue =>
  isRecord(value) &&
  (value.storageMode === NIMPVCStorageMode.NEW ||
    value.storageMode === NIMPVCStorageMode.EXISTING) &&
  typeof value.storageSizeGi === 'number' &&
  typeof value.storageClassName === 'string';

const isNIMImage = (
  value: unknown,
): value is NIMImage & {
  namespace: string;
  tags: string[];
} =>
  isRecord(value) &&
  typeof value.name === 'string' &&
  typeof value.namespace === 'string' &&
  (value.displayName === undefined || typeof value.displayName === 'string') &&
  Array.isArray(value.tags) &&
  value.tags.every((tag) => typeof tag === 'string');

const getNIMImageProperties = (
  imageValue: NIMImageFieldValue | undefined,
  externalData?: ExternalDataMap,
): TrackingProperties => {
  if (!imageValue?.repository || !imageValue.tag) {
    return {};
  }

  const properties: TrackingProperties = {
    nimImage: `${imageValue.repository}:${imageValue.tag}`,
  };
  const imageData = externalData?.[NIM_IMAGE_FIELD_ID]?.data;

  if (
    !isRecord(imageData) ||
    !isRecord(imageData.nimImages) ||
    !Array.isArray(imageData.nimImages.images)
  ) {
    return properties;
  }

  const image = imageData.nimImages.images.find(
    (candidate): candidate is NIMImage & { namespace: string; tags: string[] } =>
      isNIMImage(candidate) &&
      getImageRepository(candidate.namespace, candidate.name) === imageValue.repository &&
      candidate.tags.some((tag) => normalizeVersion(tag) === normalizeVersion(imageValue.tag)),
  );

  if (image) {
    properties.nimImageName = image.displayName ?? image.name;
  }

  return properties;
};

export const getNIMWizardTrackingProperties = (
  wizardState: WizardFormData['state'],
  externalData?: ExternalDataMap,
): TrackingProperties => {
  const properties = getNIMImageProperties(
    isNIMImageFieldValue(wizardState[NIM_IMAGE_FIELD_ID])
      ? wizardState[NIM_IMAGE_FIELD_ID]
      : undefined,
    externalData,
  );
  const pvcValue = wizardState[NIM_PVC_STORAGE_FIELD_ID];

  if (!isNIMPVCFieldValue(pvcValue)) {
    return properties;
  }

  properties.nimPvcType = pvcValue.storageMode;
  if (pvcValue.storageMode === NIMPVCStorageMode.NEW) {
    properties.nimStorageSizeGi = pvcValue.storageSizeGi;
    if (pvcValue.storageClassName) {
      properties.nimStorageClassName = pvcValue.storageClassName;
    }
  }

  return properties;
};
