import axios from 'axios';
import {
  ImageStream,
  ImageStreamTag,
  Notebook,
  NotebookSize,
  PersistentVolumeClaim,
  PersistentVolumeClaimList,
  StorageClass,
  StorageClassList,
} from '../types';
import { ANNOTATION_DESCRIPTION } from '../utilities/const';

export const getStorageClasses = (): Promise<StorageClassList> => {
  const url = '/api/kubernetes/apis/storage.k8s.io/v1/storageclasses?limit=250';
  return axios
    .get(url)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const getPvcs = (projectName: string): Promise<PersistentVolumeClaimList> => {
  const url = `/api/kubernetes/api/v1/namespaces/${projectName}/persistentvolumeclaims`;
  return axios
    .get(url)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const createPvc = (
  namespace: string,
  name: string,
  description: string | undefined,
  storageClassName: string,
  size: string,
): Promise<PersistentVolumeClaim> => {
  console.log('createPvc', namespace, name, description, storageClassName, size);
  const url = `/api/kubernetes/api/v1/namespaces/${namespace}/persistentvolumeclaims`;
  const annotations = description ? { [ANNOTATION_DESCRIPTION]: description } : undefined;

  const data: PersistentVolumeClaim = {
    apiVersion: 'v1',
    kind: 'PersistentVolumeClaim',
    metadata: {
      name,
      annotations,
    },
    spec: {
      accessModes: ['ReadWriteOnce'],
      resources: {
        requests: {
          storage: size,
        },
      },
      storageClassName: 'gp2',
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

export const deletePvc = (namespace: string, name: string): Promise<any> => {
  const url = `/api/kubernetes/api/v1/namespaces/${namespace}/persistentvolumeclaims/${name}`;

  return axios
    .delete(url)
    .then((response) => {
      return response.data;
    })
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};
