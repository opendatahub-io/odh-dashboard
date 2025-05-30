import axios from '#~/utilities/axios';
import useFetchState, { FetchState } from '#~/utilities/useFetchState';
import { DataScienceClusterKindStatus } from '#~/k8sTypes';

/**
 * Should only return `null` when on v1 Operator.
 */
const fetchDscStatus = (): Promise<DataScienceClusterKindStatus | null> => {
  const url = '/api/dsc/status';
  return axios
    .get(url)
    .then((response) => response.data)
    .catch((e) => {
      // Handle 404 errors specifically to maintain backward compatibility with tests
      if (e.response?.status === 404) {
        return null;
      }
      throw new Error(e.response?.data?.message || e.message);
    });
};

const useFetchDscStatus = (): FetchState<DataScienceClusterKindStatus | null> =>
  useFetchState(fetchDscStatus, null);

export default useFetchDscStatus;
