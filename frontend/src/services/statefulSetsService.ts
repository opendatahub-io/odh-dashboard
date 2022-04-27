import axios from 'axios';
import { StatefulSetList } from '../types';

export const getStatefulSets = (namespace: string): Promise<StatefulSetList> => {
  const url = `/api/kubernetes/apis/apps/v1/namespaces/${namespace}/statefulsets`;
  return axios
    .get(url)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};
