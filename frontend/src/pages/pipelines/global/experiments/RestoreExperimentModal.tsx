import * as React from 'react';
import { ListItem, StackItem, Stack } from '@patternfly/react-core';
import { RestoreModal } from '~/concepts/pipelines/content/RestoreModal';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { ExperimentKF } from '~/concepts/pipelines/kfTypes';
import { ExperimentListTabTitle } from '~/pages/pipelines/global/experiments/const';
import { PipelineRunTabTitle } from '~/pages/pipelines/global/runs/types';
import { BulkActionExpandableSection } from '~/pages/projects/components/BulkActionExpandableSection';

interface RestoreExperimentModalProps {
  experiments: ExperimentKF[];
  onCancel: () => void;
}

export const RestoreExperimentModal: React.FC<RestoreExperimentModalProps> = ({
  experiments,
  onCancel,
}) => {
  const isSingleRestoring = experiments.length === 1;

  const { api } = usePipelinesAPI();
  const onSubmit = React.useCallback(
    () =>
      Promise.all(
        experiments.map((experiment) => api.unarchiveExperiment({}, experiment.experiment_id)),
      ),
    [api, experiments],
  );
  return (
    <RestoreModal
      onCancel={onCancel}
      onSubmit={onSubmit}
      title={`Restore experiment${isSingleRestoring ? '' : 's'}?`}
      testId="restore-experiment-modal"
      what="experiment"
      alertTitle={`Error restoring ${
        isSingleRestoring ? experiments[0].display_name : 'experiments'
      }`}
    >
      {isSingleRestoring ? (
        <>
          <b>{experiments[0].display_name}</b> will be restored and returned to the{' '}
          <b>{ExperimentListTabTitle.ACTIVE}</b> tab. Its runs and schedules can be restored from
          the <b>{PipelineRunTabTitle.ARCHIVED}</b> and <b>{PipelineRunTabTitle.SCHEDULES}</b> tabs.
        </>
      ) : (
        <Stack hasGutter>
          <StackItem>
            <b>{experiments.length}</b> experiments will be restored and returned to the{' '}
            <b>{ExperimentListTabTitle.ACTIVE}</b> tab. Their runs can be restored from the{' '}
            <b>{PipelineRunTabTitle.ARCHIVED}</b> page.
          </StackItem>
          <StackItem>
            <BulkActionExpandableSection title="Selected experiments">
              {experiments.map((experiment) => (
                <ListItem key={experiment.experiment_id}>{experiment.display_name}</ListItem>
              ))}
            </BulkActionExpandableSection>
          </StackItem>
        </Stack>
      )}
    </RestoreModal>
  );
};
