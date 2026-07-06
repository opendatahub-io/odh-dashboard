import axios from 'axios';
import { SubscriptionStatusData } from '#~/types';

export const fetchOperatorSubscriptionStatus = (): Promise<SubscriptionStatusData> => {
  const url = '/api/operator-subscription-status';
  return axios
    .get(url)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response.data.message);
    });
};
