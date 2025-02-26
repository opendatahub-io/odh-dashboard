import { RunTypeFormat } from '~/pages/pipelines/global/modelCustomization/const';
import { HyperparameterProps } from '~/concepts/pipelines/content/modelCustomizationForm/types';

export enum ModelCustomizationEndpointType {
  PUBLIC = 'Public',
  PRIVATE = 'Private',
}

export type FormTypes =
  | {
      value: string | RunTypeFormat;
    }
  | HyperparameterProps;

export enum ProjectFields {
  PROJECT_NAME = 'projectName',
  RUN_TYPE = 'runType',
  HYPERPARAMETERS = 'hyperparameters',
  BASE_MODEL = 'baseModel',
}
