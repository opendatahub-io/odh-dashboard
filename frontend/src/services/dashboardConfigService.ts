import axios from '#~/utilities/axios';
import { DashboardConfigKind } from '#~/k8sTypes';

export const fetchDashboardConfig = (forceRefresh = false): Promise<DashboardConfigKind> => {
  const url = '/api/config';
  return axios
    .get(url, {
      headers: forceRefresh ? { 'Cache-Control': 'no-cache' } : undefined,
    })
    .then((response) => response.data);
};
