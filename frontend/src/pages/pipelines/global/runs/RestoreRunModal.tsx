import React from 'react';

import { Button, Modal } from '@patternfly/react-core';

import { usePipelinesAPI } from '~/concepts/pipelines/context';
import useNotification from '~/utilities/useNotification';
import { PipelineRunKFv2 } from '~/concepts/pipelines/kfTypes';
import { PipelineRunTabTitle } from './types';

interface RestoreRunModalProps {
  run: PipelineRunKFv2;
  onCancel(): void;
}

export const RestoreRunModal: React.FC<RestoreRunModalProps> = ({ run, onCancel }) => {
  const { api, refreshAllAPI } = usePipelinesAPI();
  const notification = useNotification();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const onConfirm = React.useCallback(async () => {
    setIsSubmitting(true);
    try {
      await api.unarchivePipelineRun({}, run.run_id);

      refreshAllAPI();
      setIsSubmitting(false);
      onCancel();
    } catch (e) {
      if (e instanceof Error) {
        notification.error('Unable to restore the pipeline run.', e.message);
      }
      setIsSubmitting(false);
    }
  }, [api, run.run_id, notification, refreshAllAPI, onCancel]);

  return (
    <Modal
      isOpen
      title="Restore run?"
      variant="small"
      onClose={onCancel}
      actions={[
        <Button
          key="confirm"
          variant="primary"
          onClick={onConfirm}
          isDisabled={isSubmitting}
          isLoading={isSubmitting}
        >
          Restore
        </Button>,
        <Button key="cancel" variant="link" onClick={onCancel}>
          Cancel
        </Button>,
      ]}
      data-testid="restore-run-modal"
    >
      <b>{run.display_name}</b> will be restored and returned to the{' '}
      <b>{PipelineRunTabTitle.Active}</b> tab.
    </Modal>
  );
};
