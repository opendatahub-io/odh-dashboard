import React from 'react';

import {
  Alert,
  Button,
  Flex,
  FlexItem,
  ListItem,
  Modal,
  Stack,
  StackItem,
  TextInput,
} from '@patternfly/react-core';

import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineRunKFv2 } from '~/concepts/pipelines/kfTypes';
import { BulkActionExpandableSection } from '~/pages/projects/components/BulkActionExpandableSection';

interface BulkArchiveRunModalProps {
  runs: PipelineRunKFv2[];
  onCancel(): void;
}

export const BulkArchiveRunModal: React.FC<BulkArchiveRunModalProps> = ({ runs, onCancel }) => {
  const { api, refreshAllAPI } = usePipelinesAPI();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<Error>();
  const [confirmInputValue, setConfirmInputValue] = React.useState('');
  const confirmMessage = `Archive ${runs.length} runs`;
  const isDisabled = confirmInputValue.trim() !== confirmMessage || isSubmitting;

  const onConfirm = React.useCallback(async () => {
    setIsSubmitting(true);

    try {
      await Promise.all(runs.map((run) => api.archivePipelineRun({}, run.run_id)));

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
      title="Archive runs?"
      titleIconVariant="warning"
      variant="small"
      onClose={onCancel}
      actions={[
        <Button
          key="confirm"
          variant="primary"
          onClick={onConfirm}
          isLoading={isSubmitting}
          isDisabled={isDisabled}
        >
          Archive
        </Button>,
        <Button key="cancel" variant="link" onClick={onCancel}>
          Cancel
        </Button>,
      ]}
      data-testid="bulk-archive-run-modal"
    >
      <Stack hasGutter>
        <StackItem>
          <b>{runs.length}</b> runs will be archived and sent to the <b>Archived</b> runs tab.
        </StackItem>

        <StackItem>
          <BulkActionExpandableSection title="Selected runs">
            {runs.map((run) => (
              <ListItem key={run.run_id}>{run.display_name}</ListItem>
            ))}
          </BulkActionExpandableSection>
        </StackItem>

        <StackItem>
          <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
            <FlexItem>
              Type <strong>{confirmMessage}</strong> to confirm archiving:
            </FlexItem>

            <TextInput
              id="confirm-bulk-archive-input"
              data-testid="confirm-archive-input"
              aria-label="confirm bulk archive input"
              value={confirmInputValue}
              onChange={(_e, newValue) => setConfirmInputValue(newValue)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !isDisabled) {
                  onConfirm();
                }
              }}
            />
          </Flex>
        </StackItem>

        {error && (
          <StackItem>
            <Alert title="Error archiving runs" isInline variant="danger">
              {error.message}
            </Alert>
          </StackItem>
        )}
      </Stack>
    </Modal>
  );
};
