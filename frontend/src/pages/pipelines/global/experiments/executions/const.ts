import { ExecutionStatus } from '~/concepts/pipelines/kfTypes';
import { Execution as MlmdExecution } from '~/third_party/mlmd';

export const executionsPageTitle = 'Executions';
export const executionsPageDescription = 'View execution metadata.';

export enum FilterOptions {
  Execution = 'name',
  Id = 'id',
  Type = 'type',
  Status = 'status',
}

export const options = {
  [FilterOptions.Execution]: 'Execution',
  [FilterOptions.Id]: 'ID',
  [FilterOptions.Type]: 'Type',
  [FilterOptions.Status]: 'Status',
};

export const initialFilterData: Record<FilterOptions, string | undefined> = {
  [FilterOptions.Execution]: '',
  [FilterOptions.Id]: '',
  [FilterOptions.Type]: undefined,
  [FilterOptions.Status]: '',
};

export const getMlmdExecutionState = (status: string): MlmdExecution.State => {
  switch (status) {
    case ExecutionStatus.NEW:
      return MlmdExecution.State.NEW;
    case ExecutionStatus.CACHED:
      return MlmdExecution.State.CACHED;
    case ExecutionStatus.CANCELED:
      return MlmdExecution.State.CANCELED;
    case ExecutionStatus.COMPLETE:
      return MlmdExecution.State.COMPLETE;
    case ExecutionStatus.FAILED:
      return MlmdExecution.State.FAILED;
    case ExecutionStatus.RUNNING:
      return MlmdExecution.State.RUNNING;
    default:
      return MlmdExecution.State.UNKNOWN;
  }
};
