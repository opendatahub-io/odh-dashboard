import React from 'react';

import {
  Alert,
  Button,
  Flex,
  FlexItem,
  Modal,
  Stack,
  StackItem,
  TextInput,
} from '@patternfly/react-core';

import { usePipelinesAPI } from '~/concepts/pipelines/context';
import { PipelineRunKFv2 } from '~/concepts/pipelines/kfTypes';

interface ArchiveRunModalProps {
  run: PipelineRunKFv2;
  onCancel(): void;
}

export const ArchiveRunModal: React.FC<ArchiveRunModalProps> = ({ run, onCancel }) => {
  const { api, refreshAllAPI } = usePipelinesAPI();
  const [confirmInputValue, setConfirmInputValue] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<Error>();
  const { display_name: runName } = run;
  const isDisabled = confirmInputValue.trim() !== runName.trim() || isSubmitting;

  const onConfirm = React.useCallback(async () => {
    setIsSubmitting(true);

    try {
      await api.archivePipelineRun({}, run.run_id);

      refreshAllAPI();
      setIsSubmitting(false);
      onCancel();
    } catch (e) {
      if (e instanceof Error) {
        setError(e);
      }

      setIsSubmitting(false);
    }
  }, [api, run.run_id, refreshAllAPI, onCancel]);

  return (
    <Modal
      title="Archive run?"
      titleIconVariant="warning"
      isOpen
      onClose={onCancel}
      actions={[
        <Button
          key="submit"
          variant="primary"
          isDisabled={isDisabled}
          isLoading={isSubmitting}
          onClick={onConfirm}
        >
          Archive
        </Button>,
        <Button key="cancel" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>,
      ]}
      variant="small"
      data-testid="archive-run-modal"
    >
      <Stack hasGutter>
        <StackItem>
          The run will be archived and sent to the <b>Archived</b> runs tab, where it can be
          restored.
        </StackItem>

        <StackItem>
          <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
            <FlexItem>
              Type <strong>{runName}</strong> to confirm archiving:
            </FlexItem>

            <TextInput
              id="confirm-archive-input"
              data-testid="confirm-archive-input"
              aria-label="confirm archive input"
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
            <Alert title={`Error archiving ${runName}`} isInline variant="danger">
              {error.message}
            </Alert>
          </StackItem>
        )}
      </Stack>
    </Modal>
  );
};
