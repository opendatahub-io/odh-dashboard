import axios from 'axios';
import { ODHSegmentKey } from '../types';

export const fetchSegmentKey = (): Promise<ODHSegmentKey> => {
  const url = '/api/segment-key';
  return axios
    .get(url)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};
