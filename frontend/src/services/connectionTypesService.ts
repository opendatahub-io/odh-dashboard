import axios from '#~/utilities/axios';
import { ResponseStatus } from '#~/types';
import {
  ConnectionTypeConfigMap,
  ConnectionTypeConfigMapObj,
} from '#~/concepts/connectionTypes/types';
import {
  toConnectionTypeConfigMap,
  toConnectionTypeConfigMapObj,
} from '#~/concepts/connectionTypes/utils';

export const fetchConnectionTypes = (): Promise<ConnectionTypeConfigMapObj[]> => {
  const url = `/api/connection-types`;
  return axios
    .get<ConnectionTypeConfigMap[]>(url)
    .then((response) =>
      response.data.reduce<ConnectionTypeConfigMapObj[]>((acc, cm) => {
        try {
          acc.push(toConnectionTypeConfigMapObj(cm));
        } catch (e) {
          // ignore those which fail to parse
        }
        return acc;
      }, []),
    )
    .catch((e) => {
      throw new Error(e?.response?.data?.message ?? e.message);
    });
};

export const fetchConnectionType = (name: string): Promise<ConnectionTypeConfigMapObj> => {
  const url = `/api/connection-types/${name}`;
  return axios
    .get<ConnectionTypeConfigMap>(url)
    .then((response) => toConnectionTypeConfigMapObj(response.data))
    .catch((e) => {
      throw new Error(e?.response?.data?.message ?? e.message);
    });
};

export const createConnectionType = (
  connectionType: ConnectionTypeConfigMapObj,
): Promise<ResponseStatus> => {
  const url = `/api/connection-types`;
  return axios
    .post<ResponseStatus>(url, toConnectionTypeConfigMap(connectionType))
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e?.response?.data?.message ?? e.message);
    });
};

export const updateConnectionType = (
  connectionType: ConnectionTypeConfigMapObj,
): Promise<ResponseStatus> => {
  const url = `/api/connection-types/${connectionType.metadata.name}`;
  return axios
    .put<ResponseStatus>(url, toConnectionTypeConfigMap(connectionType))
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e?.response?.data?.message ?? e.message);
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
    op: connectionType.metadata.annotations?.['opendatahub.io/disabled'] ? 'replace' : 'add',
    path: '/metadata/annotations/opendatahub.io~1disabled',
    value: String(!enabled),
  });

  return axios
    .patch<ResponseStatus>(url, patch)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e?.response?.data?.message ?? e.message);
    });
};

export const deleteConnectionType = (name: string): Promise<ResponseStatus> => {
  const url = `/api/connection-types/${name}`;
  return axios
    .delete<ResponseStatus>(url)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e?.response?.data?.message ?? e.message);
    });
};
