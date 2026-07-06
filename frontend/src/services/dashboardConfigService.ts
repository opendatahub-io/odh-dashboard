import type { DashboardConfigKind } from '@odh-dashboard/k8s-core';
import axios from '#~/utilities/axios';

export const fetchDashboardConfig = (forceRefresh = false): Promise<DashboardConfigKind> => {
  const url = '/api/config';
  return axios
    .get(url, {
      headers: forceRefresh ? { 'Cache-Control': 'no-cache' } : undefined,
    })
    .then((response) => response.data);
};
