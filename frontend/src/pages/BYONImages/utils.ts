import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { BYONImage } from '~/types';

export const convertBYONImageToK8sResource = (image: BYONImage): K8sResourceCommon => ({
  kind: 'ImageStream',
  apiVersion: 'image.openshift.io/v1',
  metadata: {
    name: image.name,
    annotations: {
      'openshift.io/display-name': image.display_name,
    },
  },
});

enum ImageEnabledStatus {
  ENABLED = 1,
  DISABLED = 0,
  ERROR = -1,
}

export const getEnabledStatus = (image: BYONImage): number =>
  image.visible && !image.error
    ? ImageEnabledStatus.ENABLED
    : image.error
    ? ImageEnabledStatus.ERROR
    : ImageEnabledStatus.DISABLED;
