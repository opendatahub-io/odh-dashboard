import { NotebookControllerUserState } from '../../types';

export const CUSTOM_VARIABLE = 'Custom variable';
export const EMPTY_KEY = '---NO KEY---';
export const MOUNT_PATH = '/opt/app-root/src';
export const DEFAULT_PVC_SIZE = '20Gi';
export const EMPTY_USER_STATE: NotebookControllerUserState = {
  user: '',
  lastSelectedImage: '',
  lastSelectedSize: '',
};

export enum NotebookControllerTabTypes {
  SERVER = 'server',
  ADMIN = 'admin',
}
