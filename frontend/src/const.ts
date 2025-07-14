import { KnownLabels } from '#~/k8sTypes';

export const LABEL_SELECTOR_DASHBOARD_RESOURCE = `${KnownLabels.DASHBOARD_RESOURCE}=true`;
export const LABEL_SELECTOR_MODEL_SERVING_PROJECT = KnownLabels.MODEL_SERVING_PROJECT;
export const LABEL_SELECTOR_DATA_CONNECTION_AWS = `${KnownLabels.DATA_CONNECTION_AWS}=true`;
export const LABEL_SELECTOR_PROJECT_SHARING = `${KnownLabels.PROJECT_SHARING}=true`;
