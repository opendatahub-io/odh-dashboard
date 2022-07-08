import axios from 'axios';
import { PersistentVolumeClaim } from '../types';

export const getPvc = (pvcName: string): Promise<PersistentVolumeClaim> => {
  const url = `/api/pvc/${pvcName}`;
  return axios
    .get(url)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const createPvc = (name: string, size: string): Promise<PersistentVolumeClaim> => {
  const url = `/api/pvc`;

  const data: PersistentVolumeClaim = {
    apiVersion: 'v1',
    kind: 'PersistentVolumeClaim',
    metadata: {
      name,
    },
    spec: {
      accessModes: ['ReadWriteOnce'],
      resources: {
        requests: {
          storage: size,
        },
      },
      volumeMode: 'Filesystem',
    },
    status: {
      phase: 'Pending',
    },
  };

  return axios
    .post(url, data)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const deletePvc = (pvcName: string): Promise<void> => {
  const url = `/api/pvc/${pvcName}`;

  return axios
    .delete(url)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};
