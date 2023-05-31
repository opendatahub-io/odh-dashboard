import * as path from 'path';
import './dotenv';
import { DashboardConfig, NotebookSize } from '../types';

export const PORT = process.env.PORT || process.env.BACKEND_PORT || 8080;
export const IP = process.env.IP || '0.0.0.0';
export const LOG_LEVEL = process.env.FASTIFY_LOG_LEVEL || process.env.LOG_LEVEL || 'info';
export const LOG_DIR = path.join(__dirname, '../../../logs');
export const DEV_MODE = process.env.APP_ENV === 'development';
/** Allows a username to be impersonated in place of the logged in user for testing purposes -- impacts only some API */
export const DEV_IMPERSONATE_USER = DEV_MODE ? process.env.DEV_IMPERSONATE_USER : undefined;
export const DEV_IMPERSONATE_PASSWORD = DEV_MODE ? process.env.DEV_IMPERSONATE_PASSWORD : undefined;
export const APP_ENV = process.env.APP_ENV;

export const USER_ACCESS_TOKEN = 'x-forwarded-access-token';

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
  RECOMMENDED: 'opendatahub.io/workbench-image-recommended',
};
export const blankDashboardCR: DashboardConfig = {
  apiVersion: 'opendatahub.io/v1alpha',
  kind: 'OdhDashboardConfig',
  metadata: {
    name: 'odh-dashboard-config',
    labels: {
      'opendatahub.io/dashboard': 'true',
    },
  },
  spec: {
    dashboardConfig: {
      enablement: true,
      disableInfo: false,
      disableSupport: false,
      disableClusterManager: false,
      disableTracking: true,
      disableBYONImageStream: false,
      disableISVBadges: false,
      disableAppLauncher: false,
      disableUserManagement: false,
      disableProjects: false,
      disableModelServing: false,
      disableProjectSharing: false,
      disableCustomServingRuntimes: false,
      modelMetricsNamespace: '',
      disablePipelines: false,
    },
    notebookController: {
      enabled: true,
    },
    groupsConfig: {
      adminGroups: 'odh-admins',
      allowedGroups: 'system:authenticated',
    },
    templateOrder: [],
  },
  status: {
    dependencyOperators: {
      redhatOpenshiftPipelines: {
        available: false,
        queriedForStatus: false,
      },
    },
  },
};

export const MOUNT_PATH = '/opt/app-root/src';
export const DEFAULT_PVC_SIZE = '20';

export const DEFAULT_NOTEBOOK_SIZES: NotebookSize[] = [
  {
    name: 'Small',
    resources: {
      requests: {
        cpu: '1',
        memory: '8Gi',
      },
      limits: {
        cpu: '2',
        memory: '8Gi',
      },
    },
  },
  {
    name: 'Medium',
    resources: {
      requests: {
        cpu: '3',
        memory: '24Gi',
      },
      limits: {
        cpu: '6',
        memory: '24Gi',
      },
    },
  },
  {
    name: 'Large',
    resources: {
      requests: {
        cpu: '7',
        memory: '56Gi',
      },
      limits: {
        cpu: '14',
        memory: '56Gi',
      },
    },
  },
  {
    name: 'X Large',
    resources: {
      requests: {
        cpu: '15',
        memory: '120Gi',
      },
      limits: {
        cpu: '30',
        memory: '120Gi',
      },
    },
  },
];
