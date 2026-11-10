import type { AIHubNamespaceResponse } from '@odh-dashboard/k8s-core';
import useFetchState, { FetchState } from '@odh-dashboard/ui-core/hooks/useFetchState';
import axios from '@odh-dashboard/ui-core/utilities/axios';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isAIHubNamespaceResponse = (value: unknown): value is AIHubNamespaceResponse =>
  isRecord(value) &&
  Object.keys(value).every((key) => key === 'instancesNamespace') &&
  (value.instancesNamespace === undefined || typeof value.instancesNamespace === 'string');

const fetchAIHub = (): Promise<AIHubNamespaceResponse | null> =>
  axios
    .get('/api/aihub')
    .then((response) => {
      if (response.data === null || isAIHubNamespaceResponse(response.data)) {
        return response.data;
      }

      throw new Error('Invalid AIHub response format');
    })
    .catch((error) => {
      throw new Error(error.response?.data?.message || error.message);
    });

const useFetchAIHub = (): FetchState<AIHubNamespaceResponse | null> =>
  useFetchState(fetchAIHub, null);

export default useFetchAIHub;
