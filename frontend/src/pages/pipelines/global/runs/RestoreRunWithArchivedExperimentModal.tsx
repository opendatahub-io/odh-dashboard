import * as React from 'react';
import {
  Alert,
  ExpandableSection,
  Flex,
  FlexItem,
  Label,
  Stack,
  StackItem,
  Modal,
  ModalBody,
  ModalHeader,
  ModalFooter,
} from '@patternfly/react-core';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import useRestoreStatuses from '~/concepts/pipelines/content/useRestoreStatuses';
import { ExperimentKF, PipelineRunKF } from '~/concepts/pipelines/kfTypes';
import { allSettledPromises } from '~/utilities/allSettledPromises';
import DashboardModalFooter from '~/concepts/dashboard/DashboardModalFooter';
import RunsWithArchivedExperimentTable from './RunsWithArchivedExperimentTable';
import { PipelineRunTabTitle } from './types';

type RestoreRunWithArchivedExperimentModalProps = {
  selectedRuns: PipelineRunKF[];
  archivedExperiments: ExperimentKF[];
  onClose: (restored: boolean) => void;
};

const RestoreRunWithArchivedExperimentModal: React.FC<
  RestoreRunWithArchivedExperimentModalProps
> = ({ selectedRuns, archivedExperiments, onClose }) => {
  const [isExpanded, setIsExpanded] = React.useState<boolean>(true);
  const [isRetrying, setIsRetrying] = React.useState<boolean>(false);
  const isSingleRestoring = selectedRuns.length === 1;

  const {
    onBeforeClose,
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
    abortSignal,
  } = useRestoreStatuses({
    onClose,
    isSingleRestoring,
    selectedRuns,
    archivedExperiments,
  });

  React.useEffect(() => {
    setIsRetrying(failedExperiments.length > 0 || failedRuns.length > 0);
  }, [failedExperiments.length, failedRuns.length]);

  const { api } = usePipelinesAPI();

  const restoreProcess = React.useCallback(
    async (runs: PipelineRunKF[], experiments: ExperimentKF[]) => {
      const [, , experimentResults] = await allSettledPromises(
        experiments.map((exp) =>
          api.unarchiveExperiment({ signal: abortSignal }, exp.experiment_id),
        ),
      );
      const [, , runResults] = await allSettledPromises(
        runs.map((run) => api.unarchivePipelineRun({ signal: abortSignal }, run.run_id)),
      );
      return { experimentResults, runResults };
    },
    [abortSignal, api],
  );

  const onSubmit = React.useCallback(async () => {
    setIsSubmitting(true);
    setError(undefined);
    setExperimentStatuses([]);
    setRunStatuses([]);
    const experimentsToRestore = archivedExperiments;

    const runsToRestore = selectedRuns;

    const { experimentResults, runResults } = await restoreProcess(
      runsToRestore,
      experimentsToRestore,
    );
    onBeforeClose(
      true,
      experimentResults.map((result) => (result.status === 'fulfilled' ? true : result.reason)),
      runResults.map((result) => (result.status === 'fulfilled' ? true : result.reason)),
    );
  }, [
    archivedExperiments,
    onBeforeClose,
    restoreProcess,
    selectedRuns,
    setError,
    setExperimentStatuses,
    setIsSubmitting,
    setRunStatuses,
  ]);

  return (
    <Modal
      isOpen
      data-testid="restore-run-modal"
      onClose={() =>
        onBeforeClose(
          false,
          experimentStatuses.map((status) => status.status),
          runStatuses.map((status) => status.status),
        )
      }
      variant="small"
    >
      <ModalHeader
        title={`Restore ${isSingleRestoring ? 'run' : `${selectedRuns.length} runs`}`}
        titleIconVariant="warning"
      />
      <ModalBody>
        {isSingleRestoring ? (
          <Stack hasGutter>
            <StackItem>
              <Alert
                data-testid="single-restoring-alert-message"
                isInline
                variant="info"
                component="p"
                title={
                  <span style={{ fontWeight: 'normal' }} className="pf-v6-c-alert__description">
                    The selected run belongs to the archived{' '}
                    <strong>{archivedExperiments[0].display_name}</strong> experiment. Restoring it
                    will also restore the experiment, but not other archived runs.
                  </span>
                }
              />
            </StackItem>
            <StackItem>
              The <strong>{selectedRuns[0].display_name}</strong> run and its associated{' '}
              <strong>{archivedExperiments[0].display_name}</strong> experiment will be restored.
            </StackItem>
          </Stack>
        ) : (
          <Stack hasGutter>
            <StackItem>
              <Alert
                isInline
                variant="info"
                title="At least one selected run belongs to an archived experiment. Restoring it will also restore the experiment, but not other archived runs."
              />
            </StackItem>
            <StackItem>
              {selectedRuns.length} runs will be restored and returned to the{' '}
              <b>{PipelineRunTabTitle.ACTIVE} tab</b>. {archivedExperiments.length} associated
              experiments will be restored.
            </StackItem>
            <StackItem>
              <ExpandableSection
                isExpanded={isExpanded}
                onToggle={(_, expanded) => setIsExpanded(expanded)}
                toggleContent={
                  <Flex alignItems={{ default: 'alignItemsCenter' }}>
                    <FlexItem>Selected runs</FlexItem>
                    <Label color="blue" isCompact>
                      {selectedRuns.length}
                    </Label>
                  </Flex>
                }
              >
                <RunsWithArchivedExperimentTable
                  runs={selectedRuns}
                  archivedExperiments={archivedExperiments}
                  runStatus={runStatuses}
                  experimentStatus={experimentStatuses}
                  isSubmitting={isSubmitting}
                />
              </ExpandableSection>
            </StackItem>
          </Stack>
        )}
      </ModalBody>
      <ModalFooter>
        <DashboardModalFooter
          onSubmit={onSubmit}
          isSubmitLoading={isSubmitting}
          submitLabel={
            isRetrying
              ? 'Retry'
              : `Restore run${isSingleRestoring ? '' : 's'} and experiment${
                  isSingleRestoring ? '' : 's'
                }`
          }
          onCancel={() =>
            onBeforeClose(
              false,
              experimentStatuses.map((status) => status.status),
              runStatuses.map((status) => status.status),
            )
          }
          alertTitle="Restoration failed"
          error={error}
        />
      </ModalFooter>
    </Modal>
  );
};

export default RestoreRunWithArchivedExperimentModal;
