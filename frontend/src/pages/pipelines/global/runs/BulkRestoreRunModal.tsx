import React from 'react';

import { Alert, Button, ListItem, Modal, Stack, StackItem } from '@patternfly/react-core';

import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineRunKFv2 } from '~/concepts/pipelines/kfTypes';
import { BulkActionExpandableSection } from '~/pages/projects/components/BulkActionExpandableSection';
import { PipelineRunTabTitle } from './types';

interface BulkRestoreRunModalProps {
  runs: PipelineRunKFv2[];
  onCancel(): void;
}

export const BulkRestoreRunModal: React.FC<BulkRestoreRunModalProps> = ({ runs, onCancel }) => {
  const { api, refreshAllAPI } = usePipelinesAPI();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<Error>();

  const onConfirm = React.useCallback(async () => {
    setIsSubmitting(true);

    try {
      await Promise.all(runs.map((run) => api.unarchivePipelineRun({}, run.run_id)));

      refreshAllAPI();
      setIsSubmitting(false);
      onCancel();
    } catch (e) {
      if (e instanceof Error) {
        setError(e);
      }
      setIsSubmitting(false);
    }
  }, [api, runs, onCancel, refreshAllAPI]);

  return (
    <Modal
      isOpen
      title="Restore runs?"
      variant="small"
      onClose={onCancel}
      actions={[
        <Button
          key="confirm"
          variant="primary"
          onClick={onConfirm}
          isLoading={isSubmitting}
          isDisabled={isSubmitting}
        >
          Restore
        </Button>,
        <Button key="cancel" variant="link" onClick={onCancel}>
          Cancel
        </Button>,
      ]}
      data-testid="bulk-restore-run-modal"
    >
      <Stack hasGutter>
        <StackItem>
          <b>{runs.length}</b> runs will be restored and returned to the{' '}
          <b>{PipelineRunTabTitle.Active}</b> tab.
        </StackItem>

        <StackItem>
          <BulkActionExpandableSection title="Selected runs">
            {runs.map((run) => (
              <ListItem key={run.run_id}>{run.display_name}</ListItem>
            ))}
          </BulkActionExpandableSection>
        </StackItem>

        {error && (
          <StackItem>
            <Alert title="Error restoring runs" isInline variant="danger">
              {error.message}
            </Alert>
          </StackItem>
        )}
      </Stack>
    </Modal>
  );
};
