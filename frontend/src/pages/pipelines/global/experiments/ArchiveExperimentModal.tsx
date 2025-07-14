import React from 'react';
import { ListItem, StackItem } from '@patternfly/react-core';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { ExperimentKF } from '#~/concepts/pipelines/kfTypes';
import { ArchiveModal } from '#~/concepts/pipelines/content/ArchiveModal';
import { BulkActionExpandableSection } from '#~/pages/projects/components/BulkActionExpandableSection';

interface ArchiveExperimentModalProps {
  experiments: ExperimentKF[];
  onCancel: () => void;
}

export const ArchiveExperimentModal: React.FC<ArchiveExperimentModalProps> = ({
  experiments,
  onCancel,
}) => {
  const isSingleArchiving = experiments.length === 1;
  const { api } = usePipelinesAPI();
  const onSubmit = React.useCallback(
    () =>
      Promise.all(
        experiments.map((experiment) => api.archiveExperiment({}, experiment.experiment_id)),
      ),
    [api, experiments],
  );

  return (
    <ArchiveModal
      title={`Archiving experiment${isSingleArchiving ? '' : 's'}?`}
      alertTitle={`Error archiving ${
        isSingleArchiving ? experiments[0].display_name : 'experiments'
      }`}
      confirmMessage={
        isSingleArchiving
          ? experiments[0].display_name.trim()
          : `Archive ${experiments.length} experiments`
      }
      onSubmit={onSubmit}
      onCancel={onCancel}
      testId="archive-experiment-modal"
      whatToArchive="experiments"
    >
      {isSingleArchiving ? (
        <>
          <StackItem>
            Archiving the <b>{experiments[0].display_name}</b> experiment will archive its runs and
            disable all scheduled runs.
          </StackItem>
          <StackItem>
            <b>{experiments[0].display_name}</b> can be restored, but its runs and scheduled runs
            will be inoperable.
          </StackItem>
        </>
      ) : (
        <>
          <StackItem>
            Archiving the <b>{experiments.length}</b> selected experiments will archive their runs
            and disable all scheduled runs.
          </StackItem>
          <StackItem>
            Archived experiments can be restored, but their runs and schedules will be inoperable.
          </StackItem>
          <StackItem>
            <BulkActionExpandableSection title="Selected experiments">
              {experiments.map((experiment) => (
                <ListItem key={experiment.experiment_id}>{experiment.display_name}</ListItem>
              ))}
            </BulkActionExpandableSection>
          </StackItem>
        </>
      )}
    </ArchiveModal>
  );
};
