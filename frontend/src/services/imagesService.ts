import axios from '#~/utilities/axios';
import { BYONImage, ImageInfo, ResponseStatus } from '#~/types';

export const fetchImages = (): Promise<ImageInfo[]> => {
  const url = `/api/images/jupyter`;
  return axios
    .get(url)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const fetchBYONImages = (): Promise<BYONImage[]> => {
  const url = '/api/images/byon';
  return axios
    .get(url)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const importBYONImage = (image: Partial<BYONImage>): Promise<ResponseStatus> => {
  const url = '/api/images';
  return axios
    .post(url, image)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const deleteBYONImage = (image: BYONImage): Promise<ResponseStatus> => {
  const url = `/api/images/${image.name}`;
  return axios
    .delete(url, image)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const updateBYONImage = (
  image: Pick<BYONImage, 'name'> & Partial<BYONImage>,
): Promise<ResponseStatus> => {
  const url = `/api/images/${image.name}`;
  return axios
    .put(url, image)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};
