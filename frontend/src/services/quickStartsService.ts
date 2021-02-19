import axios from 'axios';
import { getBackendURL } from '../utilities/utils';
import { QuickStart } from '@cloudmosaic/quickstarts';

export const fetchQuickStarts = (): Promise<{ quickStarts: QuickStart[]; err?: Error }> => {
  const url = getBackendURL('/api/quickstarts');
  return axios
    .get(url)
    .then((response) => {
      return { quickStarts: response.data };
    })
    .catch((e) => {
      return { quickStarts: null, err: e };
    });
};
