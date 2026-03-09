/**
 * Pipeline run states as defined by Kubeflow Pipelines API v2beta1.
 * These represent the possible values for the "state" field in a pipeline run.
 */
export enum PipelineRunState {
  /** Default value. This value is not used. */
  RUNTIME_STATE_UNSPECIFIED = 'RUNTIME_STATE_UNSPECIFIED',
  /** Service is preparing to execute an entity. */
  PENDING = 'PENDING',
  /** Entity execution is in progress. */
  RUNNING = 'RUNNING',
  /** Entity completed successfully. */
  SUCCEEDED = 'SUCCEEDED',
  /** Entity has been skipped. For example, due to caching. */
  SKIPPED = 'SKIPPED',
  /** Entity execution has failed. */
  FAILED = 'FAILED',
  /**
   * Entity is being canceled. From this state, an entity may only
   * change its state to SUCCEEDED, FAILED or CANCELED.
   */
  CANCELING = 'CANCELING',
  /** Entity has been canceled. */
  CANCELED = 'CANCELED',
  /** Entity has been paused. It can be resumed. */
  PAUSED = 'PAUSED',
}

/**
 * Terminal states that indicate the pipeline run has finished and no longer needs polling.
 */
export const TERMINAL_STATES = [
  PipelineRunState.SUCCEEDED,
  PipelineRunState.FAILED,
  PipelineRunState.CANCELED,
];

/**
 * Check if a pipeline run state is terminal (finished).
 */
export const isTerminalState = (state: string): boolean =>
  TERMINAL_STATES.some((terminalState) => terminalState === state);
