import type { DataScienceClusterInitializationKindStatus } from '@odh-dashboard/k8s-core';
import axios from '#~/utilities/axios';
import useFetchState, { FetchState } from '#~/utilities/useFetchState';

/**
 * Should only return `null` when on v1 Operator.
 */
const fetchDsciStatus = (): Promise<DataScienceClusterInitializationKindStatus | null> => {
  const url = '/api/dsci/status';
  return axios
    .get(url)
    .then((response) => response.data)
    .catch((e) => {
      if (e.response.status === 404) {
        return null;
      }
      throw new Error(e.response.data.message);
    });
};

const useFetchDsciStatus = (): FetchState<DataScienceClusterInitializationKindStatus | null> =>
  useFetchState(fetchDsciStatus, null);

export default useFetchDsciStatus;
