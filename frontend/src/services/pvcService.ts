import axios from 'axios';
import { PersistentVolumeClaim } from '../types';

export const getPvc = (projectName: string, pvcName: string): Promise<PersistentVolumeClaim> => {
  const url = `/api/pvc/${projectName}/${pvcName}`;
  return axios.get(url).then((response) => {
    return response.data;
  });
};

export const createPvc = (data: PersistentVolumeClaim): Promise<PersistentVolumeClaim> => {
  const url = `/api/pvc`;
  return axios.post(url, data).then((response) => {
    return response.data;
  });
};
