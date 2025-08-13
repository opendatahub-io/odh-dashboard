export enum PyTorchJobState {
  CREATED = 'Created',
  PENDING = 'Pending',
  RUNNING = 'Running',
  SUCCEEDED = 'Succeeded',
  FAILED = 'Failed',
  SUSPENDED = 'Suspended',
  PREEMTED = 'Preempted',
  UNKNOWN = 'Unknown',
}
