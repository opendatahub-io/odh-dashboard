import axios from 'axios';
import { getBackendURL } from '../utilities/utils';
import { QuickStart } from '@cloudmosaic/quickstarts';

export const fetchQuickStarts = (): Promise<QuickStart[]> => {
  const url = getBackendURL('/api/quickstarts');
  return axios
    .get(url)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};
