import axios from 'axios';
import { ODHSegmentKey } from '../types';
import { getBackendURL } from '../utilities/utils';

export const fetchSegmentKey = (): Promise<ODHSegmentKey> => {
  const url = getBackendURL('/api/segment-key');
  return axios
    .get(url)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};
