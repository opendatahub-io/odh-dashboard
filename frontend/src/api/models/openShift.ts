import { K8sModelCommon } from '@openshift/dynamic-plugin-sdk-utils';

export const ProjectModel: K8sModelCommon = {
  apiVersion: 'v1',
  apiGroup: 'project.openshift.io',
  kind: 'Project',
  plural: 'projects',
};

export const RouteModel: K8sModelCommon = {
  apiVersion: 'v1',
  apiGroup: 'route.openshift.io',
  kind: 'Route',
  plural: 'routes',
};
