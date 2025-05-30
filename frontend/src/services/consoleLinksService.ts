import axios from '#~/utilities/axios';
import { ConsoleLinkKind } from '#~/k8sTypes';

export const fetchConsoleLinks = (): Promise<ConsoleLinkKind[]> => {
  const url = '/api/console-links';
  return axios
    .get(url)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};
