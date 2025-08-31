export enum PyTorchJobState {
  CREATED = 'Created',
  PENDING = 'Pending',
  RUNNING = 'Running',
  SUCCEEDED = 'Succeeded',
  FAILED = 'Failed',
  PAUSED = 'Paused',
  SUSPENDED = 'Suspended',
  PREEMTED = 'Preempted',
  UNKNOWN = 'Unknown',
}
