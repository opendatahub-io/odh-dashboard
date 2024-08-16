import axios from '~/utilities/axios';
import { ResponseStatus } from '~/types';
import {
  ConnectionTypeConfigMap,
  ConnectionTypeConfigMapObj,
} from '~/concepts/connectionTypes/types';
import {
  toConnectionTypeConfigMap,
  toConnectionTypeConfigMapObj,
} from '~/concepts/connectionTypes/utils';

export const fetchConnectionTypes = (): Promise<ConnectionTypeConfigMapObj[]> => {
  const url = `/api/connection-types`;
  return axios
    .get(url)
    .then((response) =>
      response.data.map((cm: ConnectionTypeConfigMap) => toConnectionTypeConfigMapObj(cm)),
    )
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const fetchConnectionType = (name: string): Promise<ConnectionTypeConfigMapObj> => {
  const url = `/api/connection-types/${name}`;
  return axios
    .get(url)
    .then((response) => toConnectionTypeConfigMapObj(response.data))
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const createConnectionType = (
  connectionType: ConnectionTypeConfigMapObj,
): Promise<ResponseStatus> => {
  const url = `/api/connection-types`;
  return axios
    .post(url, toConnectionTypeConfigMap(connectionType))
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const updateConnectionType = (
  connectionType: ConnectionTypeConfigMapObj,
): Promise<ResponseStatus> => {
  const url = `/api/connection-types/${connectionType.metadata.name}`;
  return axios
    .put(url, toConnectionTypeConfigMap(connectionType))
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const updateConnectionTypeEnabled = (
  connectionType: ConnectionTypeConfigMapObj,
  enabled: boolean,
): Promise<ResponseStatus> => {
  const url = `/api/connection-types/${connectionType.metadata.name}`;

  const patch = [];
  if (!('annotations' in connectionType.metadata)) {
    patch.push({
      path: '/metadata/annotations',
      op: 'add',
      value: {},
    });
  }
  patch.push({
    op: connectionType.metadata.annotations?.['opendatahub.io/enabled'] ? 'replace' : 'add',
    path: '/metadata/annotations/opendatahub.io~1enabled',
    value: String(enabled),
  });

  return axios
    .patch(url, patch)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};

export const deleteConnectionType = (name: string): Promise<ResponseStatus> => {
  const url = `/api/connection-types/${name}`;
  return axios
    .delete(url)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};
