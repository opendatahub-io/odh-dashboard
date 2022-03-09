import axios from 'axios';
import { QuickStart } from '@patternfly/quickstarts';

export const fetchQuickStarts = (): Promise<QuickStart[]> => {
  const url = '/api/quickstarts';
  return axios
    .get(url)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};
