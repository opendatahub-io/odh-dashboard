import {
  k8sGetResource,
  k8sPatchResource,
  k8sUpdateResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { DashboardConfigKind } from '~/k8sTypes';
import { DASHBOARD_CONFIG } from '~/utilities/const';
import { ODHDashboardConfigModel } from '~/api/models';

export const getDashboardConfig = (ns: string): Promise<DashboardConfigKind> =>
  k8sGetResource<DashboardConfigKind>({
    model: ODHDashboardConfigModel,
    queryOptions: { name: DASHBOARD_CONFIG, ns },
  });

export const getDashboardConfigTemplateOrder = (ns: string): Promise<string[]> =>
  getDashboardConfig(ns).then((dashboardConfig) => {
    if (!dashboardConfig.spec.templateOrder) {
      throw new Error('Template order is not configured.');
    }
    return dashboardConfig.spec.templateOrder;
  });
export const updateDashboardConfig = (resource: DashboardConfigKind) =>
  k8sUpdateResource<DashboardConfigKind>({
    model: ODHDashboardConfigModel,
    resource,
  });

export const patchDashboardConfigTemplateOrder = (
  templateOrder: string[],
  ns: string,
): Promise<string[]> =>
  k8sPatchResource<DashboardConfigKind>({
    model: ODHDashboardConfigModel,
    queryOptions: { name: DASHBOARD_CONFIG, ns },
    patches: [
      {
        op: 'replace',
        path: '/spec/templateOrder',
        value: templateOrder,
      },
    ],
  }).then((dashboardConfig) => dashboardConfig.spec?.templateOrder || []);
