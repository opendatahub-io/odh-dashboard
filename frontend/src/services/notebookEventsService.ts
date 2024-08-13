import axios from '~/utilities/axios';
import { K8sEvent } from '~/types';

export const getNotebookEvents = (
  projectName: string,
  notebookName: string,
  podUID?: string,
): Promise<K8sEvent[]> => {
  const url = `/api/nb-events/${projectName}/${notebookName}${podUID ? `/${podUID}` : ''}`;
  return axios.get(url).then((response) => response.data);
};
