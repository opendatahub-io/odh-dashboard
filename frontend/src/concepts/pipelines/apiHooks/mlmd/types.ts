import { Context } from '~/third_party/mlmd';

export type MlmdContext = Context;

export enum MlmdContextTypes {
  RUN = 'system.PipelineRun',
}
