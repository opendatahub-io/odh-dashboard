import axios from 'axios';
import {
  BYONImage,
  BYONImageCreateRequest,
  BYONImageUpdateRequest,
  ImageType,
  ResponseStatus,
} from '../types';

//BYON Specific functions
export const fetchBYONImages = (type: ImageType): Promise<BYONImage[]> => {
  const url = `/api/images/${type}`;
  return axios
    .get(url)
    .then((response) => {
      return response.data.notebooks;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const importBYONImage = (image: BYONImageCreateRequest): Promise<ResponseStatus> => {
  const url = '/api/images';
  return axios
    .post(url, image)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const deleteBYONImage = (image: BYONImage): Promise<ResponseStatus> => {
  const url = `/api/images/${image.id}`;
  return axios
    .delete(url, image)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const updateBYONImage = (image: BYONImageUpdateRequest): Promise<ResponseStatus> => {
  const url = `/api/images/${image.id}`;
  return axios
    .put(url, image)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};
