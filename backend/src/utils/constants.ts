import './dotenv';
import { DashboardConfig } from '../types';
import { V1ConfigMap } from '@kubernetes/client-node';

export const PORT = process.env.PORT || process.env.BACKEND_PORT || 8080;
export const IP = process.env.IP || '0.0.0.0';
export const LOG_LEVEL = process.env.FASTIFY_LOG_LEVEL || process.env.LOG_LEVEL || 'info';
export const DEV_MODE = process.env.APP_ENV === 'development';
export const APP_ENV = process.env.APP_ENV;

export const yamlRegExp = /\.ya?ml$/;
export const mdRegExp = /\.md$/;

export const IMAGE_ANNOTATIONS = {
  DESC: 'opendatahub.io/notebook-image-desc',
  DISP_NAME: 'opendatahub.io/notebook-image-name',
  URL: 'opendatahub.io/notebook-image-url',
  DEFAULT: 'opendatahub.io/default-image',
  SOFTWARE: 'opendatahub.io/notebook-software',
  DEPENDENCIES: 'opendatahub.io/notebook-python-dependencies',
  IMAGE_ORDER: 'opendatahub.io/notebook-image-order',
  RECOMMENDED: 'opendatahub.io/notebook-image-recommended',
};
export const blankDashboardCR: DashboardConfig = {
  apiVersion: 'opendatahub.io/v1alpha',
  kind: 'OdhDashboardConfig',
  metadata: {
    name: 'odh-dashboard-config',
  },
  spec: {
    dashboardConfig: {
      enablement: true,
      disableInfo: false,
      disableSupport: false,
      disableClusterManager: false,
      disableTracking: false,
      disableBYONImageStream: false,
      disableISVBadges: false,
      disableAppLauncher: false,
      disableUserManagement: false,
    },
  },
};

export const defaultCullingSettings: V1ConfigMap = {
  apiVersion: 'v1',
  kind: 'ConfigMap',
  metadata: {
    name: 'notebook-controller-culler-config',
  },
  data: {
    ENABLE_CULLING: 'true',
    CULL_IDLE_TIME: '60', // In minutes
    IDLENESS_CHECK_PERIOD: '5', //In minutes
  },
};
