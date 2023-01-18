import axios from 'axios';
import { K8sEvent } from '../types';

export const getNotebookEvents = (projectName: string, podUID: string): Promise<K8sEvent[]> => {
  const url = `/api/nb-events/${projectName}/${podUID}`;
  return axios.get(url).then((response) => {
    return response.data;
  });
};
