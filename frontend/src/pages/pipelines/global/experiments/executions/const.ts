import { ExecutionStatus } from '#~/concepts/pipelines/kfTypes';
import { Event, Execution as MlmdExecution } from '#~/third_party/mlmd';
import { PickEnum } from '#~/typeHelpers';

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

export const inputOutputSectionTitle: Record<
  PickEnum<
    Event.Type,
    Event.Type.DECLARED_INPUT | Event.Type.INPUT | Event.Type.OUTPUT | Event.Type.DECLARED_OUTPUT
  >,
  string
> = {
  [Event.Type.INPUT]: 'Inputs',
  [Event.Type.DECLARED_INPUT]: 'Declared inputs',
  [Event.Type.DECLARED_OUTPUT]: 'Declared outputs',
  [Event.Type.OUTPUT]: 'Outputs',
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
