import { NotebookControllerUserState } from '#~/types';

export const CUSTOM_VARIABLE = 'Custom variable';
export const EMPTY_KEY = '---NO KEY---';
export const CURRENT_BROWSER_TAB_PREFERENCE = 'odh.dashboard.kfnbc.tab.preference';
export const ENV_VAR_NAME_REGEX = new RegExp('^[-._a-zA-Z][-._a-zA-Z0-9]*$');
export const EMPTY_USER_STATE: NotebookControllerUserState = {
  user: '',
  lastSelectedImage: '',
  lastSelectedSize: '',
};
export const DEFAULT_NOTEBOOK_SIZES = [
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

export enum NotebookControllerTabTypes {
  SERVER = 'server',
  ADMIN = 'admin',
}
