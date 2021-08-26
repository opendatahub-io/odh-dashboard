import axios from 'axios';
import { getBackendURL } from '../utilities/utils';
import { ConsoleLinkKind } from '../types';

export const fetchConsoleLinks = (): Promise<ConsoleLinkKind[]> => {
  const url = getBackendURL('/api/console-links');
  return axios
    .get(url)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};
