import { DashboardConfig } from '../types';
import './dotenv';

export const PORT = process.env.PORT || process.env.BACKEND_PORT || 8080;
export const IP = process.env.IP || '0.0.0.0';
export const LOG_LEVEL = process.env.FASTIFY_LOG_LEVEL || process.env.LOG_LEVEL || 'info';
export const DEV_MODE = process.env.APP_ENV === 'development';
export const APP_ENV = process.env.APP_ENV;

export const yamlRegExp = /\.ya?ml$/;
export const mdRegExp = /\.md$/;

export const blankDashboardCR: DashboardConfig = {
    apiVersion: 'opendatahub.io/v1alpha',
    kind: 'OdhDashboard',
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
            disableISVBadges: false
        },
    }
};