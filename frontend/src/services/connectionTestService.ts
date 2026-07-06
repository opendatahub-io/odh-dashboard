import axios from '#~/utilities/axios';
import { ConnectionTestRequest, ConnectionTestResult } from '#~/concepts/connectionTypes/types';

type ConnectionTestEnvelope = {
  data: ConnectionTestResult;
};

export const testConnection = (
  request: ConnectionTestRequest,
  signal?: AbortSignal,
): Promise<ConnectionTestResult> => {
  const url = '/core-bff/api/v1/connections/test';
  return axios
    .post<ConnectionTestEnvelope>(url, request, { signal, timeout: 15_000 })
    .then((response) => response.data.data)
    .catch((e) => {
      throw new Error(e?.response?.data?.error?.message ?? e.message);
    });
};
