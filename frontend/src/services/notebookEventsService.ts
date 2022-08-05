import axios from 'axios';
import { K8sEvent } from '../types';

export const getNotebookEvents = (
  projectName: string,
  notebookName: string,
): Promise<K8sEvent[]> => {
  const url = `/api/nb-events/${projectName}/${notebookName}`;
  return axios.get(url).then((response) => {
    return response.data;
  });
};
