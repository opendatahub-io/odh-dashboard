import * as React from 'react';
import { ListItem, Stack, StackItem } from '@patternfly/react-core';
import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineRunKFv2 } from '~/concepts/pipelines/kfTypes';
import { RestoreModal } from '~/concepts/pipelines/content/RestoreModal';
import { BulkActionExpandableSection } from '~/pages/projects/components/BulkActionExpandableSection';
import { PipelineRunTabTitle } from './types';

interface RestoreRunModalProps {
  isOpen: boolean;
  runs: PipelineRunKFv2[];
  onCancel: () => void;
}

export const RestoreRunModal: React.FC<RestoreRunModalProps> = ({ isOpen, runs, onCancel }) => {
  const isSingleRestoring = runs.length === 1;
  const { api } = usePipelinesAPI();
  const onSubmit = React.useCallback(
    () => Promise.all(runs.map((run) => api.unarchivePipelineRun({}, run.run_id))),
    [api, runs],
  );
  return (
    <RestoreModal
      title={`Restore run${isSingleRestoring ? '' : 's'}?`}
      onCancel={onCancel}
      onSubmit={onSubmit}
      isOpen={isOpen}
      testId="restore-run-modal"
      alertTitle={`Error restoring ${isSingleRestoring ? runs[0].display_name : 'runs'}`}
    >
      {isSingleRestoring ? (
        <>
          <b>{runs[0].display_name}</b> will be restored and returned to the{' '}
          <b>{PipelineRunTabTitle.ACTIVE}</b> tab.
        </>
      ) : (
        <Stack hasGutter>
          <StackItem>
            <b>{runs.length}</b> runs will be restored and returned to the{' '}
            <b>{PipelineRunTabTitle.ACTIVE}</b> tab.
          </StackItem>
          <StackItem>
            <BulkActionExpandableSection title="Selected runs">
              {runs.map((run) => (
                <ListItem key={run.run_id}>{run.display_name}</ListItem>
              ))}
            </BulkActionExpandableSection>
          </StackItem>
        </Stack>
      )}
    </RestoreModal>
  );
};
