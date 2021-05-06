import axios from 'axios';
import { getBackendURL } from '../utilities/utils';
import { ODHDoc } from '@common/types';

export const fetchDocs = (docType?: string): Promise<ODHDoc[]> => {
  const url = getBackendURL('/api/docs');
  const searchParams = new URLSearchParams();
  if (docType) {
    searchParams.set('type', docType);
  }
  const options = { params: searchParams };
  return axios
    .get(url, options)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};
