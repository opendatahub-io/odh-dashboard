export enum PyTorchJobState {
  CREATED = 'Created',
  PENDING = 'Pending',
  QUEUED = 'Queued',
  RUNNING = 'Running',
  RESTARTING = 'Restarting',
  SUCCEEDED = 'Succeeded',
  FAILED = 'Failed',
  PAUSED = 'Paused',
  SUSPENDED = 'Suspended',
  PREEMPTED = 'Preempted',
  UNKNOWN = 'Unknown',
}
