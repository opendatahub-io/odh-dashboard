import type { AIHubKind } from '@odh-dashboard/k8s-core';
import useFetchState, { FetchState } from '@odh-dashboard/ui-core/hooks/useFetchState';
import axios from '@odh-dashboard/ui-core/utilities/axios';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const isAIHubKind = (value: unknown): value is AIHubKind =>
  isRecord(value) &&
  value.apiVersion === 'components.platform.opendatahub.io/v1alpha1' &&
  value.kind === 'AIHub' &&
  isRecord(value.metadata) &&
  typeof value.metadata.name === 'string' &&
  isRecord(value.spec) &&
  (value.spec.instancesNamespace === undefined ||
    typeof value.spec.instancesNamespace === 'string');

const fetchAIHub = (): Promise<AIHubKind | null> =>
  axios
    .get('/api/aihub')
    .then((response) => {
      if (response.data === null || isAIHubKind(response.data)) {
        return response.data;
      }

      throw new Error('Invalid AIHub response format');
    })
    .catch((error) => {
      throw new Error(error.response?.data?.message || error.message);
    });

const useFetchAIHub = (): FetchState<AIHubKind | null> => useFetchState(fetchAIHub, null);

export default useFetchAIHub;
