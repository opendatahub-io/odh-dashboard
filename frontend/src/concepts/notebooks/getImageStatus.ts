import { NotebookImageAvailability } from '~/pages/projects/screens/detail/notebooks/const';
import { NotebookImageData } from '~/pages/projects/screens/detail/notebooks/types';
import { ImageStreamStatus } from './types';

export const getImageStatus = (
  imageData: NotebookImageData[0],
): ImageStreamStatus | NotebookImageAvailability | undefined => {
  if (imageData && imageData.imageAvailability === NotebookImageAvailability.DELETED) {
    return NotebookImageAvailability.DELETED;
  }
  if (imageData && imageData.imageAvailability === NotebookImageAvailability.DISABLED) {
    return NotebookImageAvailability.DISABLED;
  }
  if (
    imageData &&
    imageData.imageVersion.annotations?.['opendatahub.io/image-tag-outdated'] === 'true'
  ) {
    return ImageStreamStatus.OUTDATED;
  }
  if (
    imageData &&
    imageData.imageVersion.annotations?.['opendatahub.io/workbench-image-recommended'] === 'true'
  ) {
    return ImageStreamStatus.LATEST;
  }
  return undefined;
};
