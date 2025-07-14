import React from 'react';
import { ListItem, StackItem } from '@patternfly/react-core';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { PipelineRunKF } from '#~/concepts/pipelines/kfTypes';
import { ArchiveModal } from '#~/concepts/pipelines/content/ArchiveModal';
import { PipelineRunTabTitle } from '#~/pages/pipelines/global/runs/types';
import { BulkActionExpandableSection } from '#~/pages/projects/components/BulkActionExpandableSection';

interface ArchiveRunModalProps {
  runs: PipelineRunKF[];
  onCancel: () => void;
}

export const ArchiveRunModal: React.FC<ArchiveRunModalProps> = ({ runs, onCancel }) => {
  const isSingleArchiving = runs.length === 1;
  const { api } = usePipelinesAPI();
  const onSubmit = React.useCallback(
    () => Promise.all(runs.map((run) => api.archivePipelineRun({}, run.run_id))),
    [api, runs],
  );

  return (
    <ArchiveModal
      title={`Archiving run${isSingleArchiving ? '' : 's'}?`}
      alertTitle={`Error archiving ${isSingleArchiving ? runs[0].display_name : 'runs'}`}
      confirmMessage={
        isSingleArchiving ? runs[0].display_name.trim() : `Archive ${runs.length} runs`
      }
      onSubmit={onSubmit}
      onCancel={onCancel}
      testId="archive-run-modal"
      whatToArchive="runs"
    >
      {isSingleArchiving ? (
        <StackItem>
          The run will be archived and sent to the <b>{PipelineRunTabTitle.ARCHIVED}</b> tab, where
          it can be restored.
        </StackItem>
      ) : (
        <>
          <StackItem>
            <b>{runs.length}</b> runs will be archived and sent to the{' '}
            <b>{PipelineRunTabTitle.ARCHIVED}</b> tab.
          </StackItem>
          <StackItem>
            <BulkActionExpandableSection title="Selected runs">
              {runs.map((run) => (
                <ListItem key={run.run_id}>{run.display_name}</ListItem>
              ))}
            </BulkActionExpandableSection>
          </StackItem>
        </>
      )}
    </ArchiveModal>
  );
};
