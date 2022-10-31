import { K8sModelCommon } from '@openshift/dynamic-plugin-sdk-utils';

export const BuildConfigModel: K8sModelCommon = {
  apiVersion: 'v1',
  apiGroup: 'build.openshift.io',
  kind: 'BuildConfig',
  plural: 'buildconfigs',
};

export const BuildModel: K8sModelCommon = {
  apiVersion: 'v1',
  apiGroup: 'build.openshift.io',
  kind: 'Build',
  plural: 'builds',
};

export const ImageStreamModel: K8sModelCommon = {
  apiVersion: 'v1',
  apiGroup: 'image.openshift.io',
  kind: 'ImageStream',
  plural: 'imagestreams',
};

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
