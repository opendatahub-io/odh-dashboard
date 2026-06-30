import type { ODHSegmentKey } from '@odh-dashboard/analytics';
import axios from '#~/utilities/axios';

export const fetchSegmentKey = (): Promise<ODHSegmentKey> => {
  const url = '/api/segment-key';
  return axios
    .get(url)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};
