import { ImageInfo } from '../../../types';
import { getImageInfo } from '../../../utils/resourceUtils';

export const listImageStreams = async (): Promise<ImageInfo[]> => {
  return Promise.resolve(getImageInfo());
};
