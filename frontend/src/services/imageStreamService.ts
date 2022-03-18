import axios from 'axios';
import { ImageStreamList } from '../types';

export const getImageStreams = (): Promise<ImageStreamList> => {
  const url = `/api/imagestreams`;
  return axios
    .get(url)
    .then((response) => {
      return response.data as ImageStreamList;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};
