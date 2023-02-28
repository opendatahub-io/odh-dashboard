import axios from 'axios';
import {
  BYONImage,
  BYONImageCreateRequest,
  BYONImageUpdateRequest,
  ImageInfo,
  ResponseStatus,
} from '~/types';

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

export const importBYONImage = (image: BYONImageCreateRequest): Promise<ResponseStatus> => {
  const url = '/api/images';
  return axios
    .post(url, image)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const deleteBYONImage = (image: BYONImage): Promise<ResponseStatus> => {
  const url = `/api/images/${image.id}`;
  return axios
    .delete(url, image)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const updateBYONImage = (image: BYONImageUpdateRequest): Promise<ResponseStatus> => {
  const url = `/api/images/${image.id}`;
  return axios
    .put(url, image)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};
