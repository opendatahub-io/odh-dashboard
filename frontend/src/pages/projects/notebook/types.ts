import { NotebookKind } from '#~/k8sTypes';

/** The state behind the notebook status */
export type NotebookDataState = {
  notebook: NotebookKind;
  isStarting: boolean;
  isRunning: boolean;
  isStopping: boolean;
  isStopped: boolean;
  runningPodUid: string;
};

/** A refresh function that can be waited on to complete the refresh and then acted on */
export type NotebookRefresh = () => Promise<void>;

/** The actionable state we should use -- contains runtime functions for use-cases */
export type NotebookState = NotebookDataState & {
  refresh: NotebookRefresh;
};
