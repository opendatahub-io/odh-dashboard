// TODO: Delete once we refactor Admin panel to support Passthrough API
import axios from '#~/utilities/axios';
import { DashboardConfigKind } from '#~/k8sTypes';
import { DASHBOARD_CONFIG } from '#~/utilities/const';

export const getDashboardConfigBackend = (namespace: string): Promise<DashboardConfigKind> =>
  axios
    .get(`/api/dashboardConfig/${namespace}/${DASHBOARD_CONFIG}`)
    .then((response) => response.data)
    .catch((e) => Promise.reject(e));

export const getDashboardConfigTemplateOrderBackend = (ns: string): Promise<string[]> =>
  getDashboardConfigBackend(ns).then((dashboardConfig) => dashboardConfig.spec.templateOrder || []);

export const getDashboardConfigTemplateDisablementBackend = (ns: string): Promise<string[]> =>
  getDashboardConfigBackend(ns).then(
    (dashboardConfig) => dashboardConfig.spec.templateDisablement || [],
  );

export const patchDashboardConfigTemplateOrderBackend = (
  templateOrder: string[],
  namespace: string,
): Promise<string[]> =>
  axios
    .patch<DashboardConfigKind>(`/api/dashboardConfig/${namespace}/${DASHBOARD_CONFIG}`, [
      {
        op: 'replace',
        path: '/spec/templateOrder',
        value: templateOrder,
      },
    ])
    .then((response) => {
      // Patch doesn't return an error if the attribute is disabled, it just return the object without changes
      if (response.data.spec.templateOrder === undefined) {
        throw new Error('Template order is not configured');
      }
      return response.data.spec.templateOrder;
    })
    .catch((e) => Promise.reject(e));

export const patchDashboardConfigTemplateDisablementBackend = (
  templateDisablement: string[],
  namespace: string,
): Promise<string[]> =>
  axios
    .patch<DashboardConfigKind>(`/api/dashboardConfig/${namespace}/${DASHBOARD_CONFIG}`, [
      {
        op: 'replace',
        path: '/spec/templateDisablement',
        value: templateDisablement,
      },
    ])
    .then((response) => {
      // Patch doesn't return an error if the attribute is disabled, it just return the object without changes
      if (response.data.spec.templateDisablement === undefined) {
        throw new Error('Template disablement is not configured');
      }
      return response.data.spec.templateDisablement;
    })
    .catch((e) => Promise.reject(e));
