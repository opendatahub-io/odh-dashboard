export enum PyTorchJobState {
  CREATED = 'Created',
  PENDING = 'Pending',
  RUNNING = 'Running',
  SUCCEEDED = 'Succeeded',
  FAILED = 'Failed',
  HIBERNATED = 'Hibernated',
  UNKNOWN = 'Unknown',
}

export type PyTorchJobStatus = {
  phase: PyTorchJobState;
  message?: string;
  startTime?: string;
  completionTime?: string;
  masterReplicas?: {
    active: number;
    succeeded: number;
    failed: number;
  };
  workerReplicas?: {
    active: number;
    succeeded: number;
    failed: number;
  };
};
