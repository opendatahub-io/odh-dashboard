import type { OdhApplication } from '@odh-dashboard/k8s-core';
import axios from '@odh-dashboard/ui-core/utilities/axios';

export const fetchComponents = (installed: boolean): Promise<OdhApplication[]> => {
  const url = '/api/components';
  const searchParams = new URLSearchParams();
  if (installed) {
    searchParams.set('installed', 'true');
  }
  const options = { params: searchParams };
  return axios
    .get(url, options)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response?.data?.message || e.message);
    });
};

export const removeComponent = (appName: string): Promise<{ success: boolean; error: string }> => {
  const url = '/api/components/remove';
  const searchParams = new URLSearchParams();
  if (appName) {
    searchParams.set('appName', appName);
  }
  const options = { params: searchParams };
  return axios
    .get(url, options)
    .then((response) => response.data)
    .catch((e) => {
      throw new Error(e.response?.data?.error || e.message);
    });
};
