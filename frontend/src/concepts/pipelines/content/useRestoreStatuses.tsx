import * as React from 'react';
import { Link } from 'react-router-dom';
import { PipelineRunKF, ExperimentKF } from '~/concepts/pipelines/kfTypes';
import useNotification from '~/utilities/useNotification';
import { experimentRoute } from '~/routes';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import {
  ExperimentStatus,
  PipelineResourceRestoreResult,
  RunStatus,
} from '~/pages/pipelines/global/runs/types';
import { processExperimentResults, processRunResults } from '~/pages/pipelines/global/runs/utils';

type RestoreStatusesProps = {
  onClose: (restored: boolean) => void;
  selectedRuns: PipelineRunKF[];
  isSingleRestoring: boolean;
  archivedExperiments: ExperimentKF[];
};

const useRestoreStatuses = ({
  onClose,
  selectedRuns,
  isSingleRestoring,
  archivedExperiments,
}: RestoreStatusesProps): {
  onBeforeClose: (
    v: boolean,
    experimentResults?: PipelineResourceRestoreResult[],
    runResults?: PipelineResourceRestoreResult[],
  ) => void;
  failedRuns: PipelineRunKF[];
  isSubmitting: boolean;
  setIsSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
  setRunStatuses: React.Dispatch<React.SetStateAction<RunStatus[]>>;
  setExperimentStatuses: React.Dispatch<React.SetStateAction<ExperimentStatus[]>>;
  failedExperiments: ExperimentKF[];
  error: React.ReactNode | undefined;
  setError: React.Dispatch<React.SetStateAction<React.ReactNode | undefined>>;
  runStatuses: RunStatus[];
  experimentStatuses: ExperimentStatus[];
  abortSignal: AbortSignal;
} => {
  const notification = useNotification();
  const [failedRuns, setFailedRuns] = React.useState<PipelineRunKF[]>([]);
  const [failedExperiments, setFailedExperiments] = React.useState<ExperimentKF[]>([]);
  const { namespace } = usePipelinesAPI();
  const [error, setError] = React.useState<React.ReactNode>();
  const [runStatuses, setRunStatuses] = React.useState<RunStatus[]>([]);
  const [experimentStatuses, setExperimentStatuses] = React.useState<ExperimentStatus[]>([]);
  const [isSubmitting, setIsSubmitting] = React.useState<boolean>(false);
  const abortControllerRef = React.useRef(new AbortController());

  const onBeforeCloseRef = React.useRef<
    (
      v: boolean,
      experimentResults?: PipelineResourceRestoreResult[],
      runResults?: PipelineResourceRestoreResult[],
    ) => void
  >(() => undefined);

  onBeforeCloseRef.current = (
    restoreComplete: boolean,
    experimentResults: PipelineResourceRestoreResult[] = [],
    runResults: PipelineResourceRestoreResult[] = [],
  ) => {
    const { failedExperimentsResult, successfulExperimentsResult, experimentStatusesResult } =
      processExperimentResults(experimentResults, archivedExperiments);
    const { failedRunsResult, successfulRunsResult, runStatusesResult } = processRunResults(
      runResults,
      selectedRuns,
    );

    setExperimentStatuses(experimentStatusesResult);
    setRunStatuses(runStatusesResult);

    setFailedExperiments(failedExperimentsResult);
    setFailedRuns(failedRunsResult);

    if (!restoreComplete || failedRunsResult.length === 0) {
      abortControllerRef.current.abort();
      if (successfulExperimentsResult.length > 0) {
        const link = isSingleRestoring ? (
          <Link to={experimentRoute(namespace, successfulExperimentsResult[0].experiment_id)}>
            View experiment details
          </Link>
        ) : (
          <Link to={experimentRoute(namespace, undefined)}>View experiments table list</Link>
        );
        notification.success(
          `${
            isSingleRestoring
              ? `${successfulExperimentsResult[0].display_name} experiment restored`
              : `${successfulExperimentsResult.length} associated experiments restored`
          }`,
          link,
        );
      }

      //handle failed runs alerts
      if (failedRunsResult.length > 0) {
        notification.error(
          isSingleRestoring
            ? `Failed to restore the ${failedRunsResult[0].display_name} run.`
            : `Failed to restore runs: ${failedRunsResult
                .map((run) => run.display_name)
                .join(',')} could not be restored.`,
        );
      }

      if (successfulRunsResult.length > 0) {
        notification.success(
          isSingleRestoring
            ? `${successfulRunsResult[0].display_name} run restored`
            : `${successfulRunsResult.length} runs restored`,
        );
      }

      onClose(successfulRunsResult.length > 0 ? true : restoreComplete);
      setIsSubmitting(false);
      setError(undefined);
      setExperimentStatuses([]);
      setRunStatuses([]);
      abortControllerRef.current = new AbortController();
    } else {
      const firstFailedRun = failedRunsResult[0];
      const firstArchivedExperiment = archivedExperiments[0];

      const errorMessage = isSingleRestoring ? (
        failedExperimentsResult.length === 0 ? (
          <>
            The <strong>{firstFailedRun.display_name}</strong> run could not be restored, but its
            associated <strong>{firstArchivedExperiment.display_name}</strong> experiment was
            restored. Try again.
          </>
        ) : (
          <>
            The <strong>{firstFailedRun.display_name}</strong> run could not be restored. Try again.
          </>
        )
      ) : (
        <>
          Failed to restore runs:{' '}
          <strong>{failedRunsResult.map((run) => run.display_name).join(', ')}</strong> cannot be
          restored. Try again.
        </>
      );

      setError(errorMessage);
      setIsSubmitting(false);
    }
  };

  return {
    onBeforeClose: onBeforeCloseRef.current,
    failedRuns,
    failedExperiments,
    error,
    isSubmitting,
    setExperimentStatuses,
    setRunStatuses,
    setIsSubmitting,
    setError,
    runStatuses,
    experimentStatuses,
    abortSignal: abortControllerRef.current.signal,
  };
};

export default useRestoreStatuses;
