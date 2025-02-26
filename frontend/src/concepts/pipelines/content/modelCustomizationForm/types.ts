import { HyperparameterFields } from '~/pages/pipelines/global/modelCustomization/const';
import { ParameterKF } from '~/concepts/pipelines/kfTypes';

export type HyperparameterProps = Record<HyperparameterFields | string, ParameterKF>;
