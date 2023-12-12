import { FieldOptions } from '~/components/FieldList';
import { GITDataEntry } from './types';

export const EDGE_CONSTANT = process.env.EDGE_CONSTANT || 'edge-mvp';

export const EDGE_PIPELINE_NAME = 'aiedge-e2e';

export const EDGE_UNIQUE_LABEL = 'app=rhoai-edge-pipelines';

export enum GIT_KEYS {
  GIT_REPOSITORY_URL = 'GIT_REPOSITORY_URL',
  BRANCH = 'BRANCH',
  PATH = 'PATH',
  PERSONAL_ACCESS_TOKEN = 'PERSONAL_ACCESS_TOKEN',
}
export const PIPELINE_GIT_KEY = [
  GIT_KEYS.GIT_REPOSITORY_URL,
  GIT_KEYS.BRANCH,
  GIT_KEYS.PATH,
  GIT_KEYS.PERSONAL_ACCESS_TOKEN,
];
export const GIT_FIELDS: FieldOptions[] = [
  {
    key: GIT_KEYS.GIT_REPOSITORY_URL,
    label: 'Git repository URL',
    isRequired: true,
  },
  {
    key: GIT_KEYS.BRANCH,
    label: 'Branch',
    isRequired: true,
  },
  {
    key: GIT_KEYS.PATH,
    label: 'Path',
    isRequired: true,
  },
  {
    key: GIT_KEYS.PERSONAL_ACCESS_TOKEN,
    label: 'Personal access token',
  },
];
export const PIPELINE_GIT_FIELDS: FieldOptions[] = [
  {
    key: GIT_KEYS.GIT_REPOSITORY_URL,
    label: 'Git repository URL',
    isRequired: true,
  },
  {
    key: GIT_KEYS.BRANCH,
    label: 'Branch',
    isRequired: true,
  },
  {
    key: GIT_KEYS.PATH,
    label: 'Path',
    isRequired: true,
  },
  {
    key: GIT_KEYS.PERSONAL_ACCESS_TOKEN,
    label: 'Personal access token',
    isRequired: true,
  },
];

export const EMPTY_GIT_SECRET_DATA: GITDataEntry = [
  {
    key: GIT_KEYS.GIT_REPOSITORY_URL,
    value: '',
  },
  {
    key: GIT_KEYS.BRANCH,
    value: '',
  },
  {
    key: GIT_KEYS.PATH,
    value: '',
  },
  {
    key: GIT_KEYS.PERSONAL_ACCESS_TOKEN,
    value: '',
  },
];
export const EMPTY_GIT_PIPELINE_DATA: GITDataEntry = [
  {
    key: GIT_KEYS.GIT_REPOSITORY_URL,
    value: '',
  },
  {
    key: GIT_KEYS.BRANCH,
    value: '',
  },
  {
    key: GIT_KEYS.PATH,
    value: '',
  },
  {
    key: GIT_KEYS.PERSONAL_ACCESS_TOKEN,
    value: '',
  },
];

export enum ModelFrameworks {
  PYTORCH = 'PyTorch',
  TENSORFLOW = 'TensorFlow',
  OPENVINO = 'OpenVino',
  ONNX = 'Onnx',
}

export const modelFrameworkOptions = [
  {
    value: ModelFrameworks.PYTORCH,
    label: ModelFrameworks.PYTORCH,
    disabled: false,
    isPlaceholder: false,
  },
  {
    value: ModelFrameworks.TENSORFLOW,
    label: ModelFrameworks.TENSORFLOW,
    disabled: false,
    isPlaceholder: false,
  },
  {
    value: ModelFrameworks.OPENVINO,
    label: ModelFrameworks.OPENVINO,
    disabled: false,
    isPlaceholder: false,
  },
  {
    value: ModelFrameworks.ONNX,
    label: ModelFrameworks.ONNX,
    disabled: false,
    isPlaceholder: false,
  },
];
