import * as React from 'react';
import { Alert, Button, Modal, ModalBody, ModalFooter, ModalHeader } from '@patternfly/react-core';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { EvaluationJob } from '~/app/types';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';
import { getEvaluationName } from '~/app/utilities/evaluationUtils';
import { cancelEvaluationJob } from '~/app/api/k8s';

type StopEvaluationModalProps = {
  job: EvaluationJob;
  namespace: string;
  onClose: () => void;
  onComplete: () => void;
};

const StopEvaluationModal: React.FC<StopEvaluationModalProps> = ({
  job,
  namespace,
  onClose,
  onComplete,
}) => {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [actionError, setActionError] = React.useState<string | null>(null);
  const evaluationName = getEvaluationName(job);

  const handleConfirm = async () => {
    if (!namespace) {
      setActionError('Namespace is required to perform this action');
      return;
    }
    setIsSubmitting(true);
    setActionError(null);
    try {
      await cancelEvaluationJob('', namespace, job.resource.id)({});
      fireMiscTrackingEvent(EVAL_HUB_EVENTS.EVALUATION_STOPPED, {
        evaluationName,
        previousState: job.status.state,
      });
      onClose();
      onComplete();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={() => {
        if (isSubmitting) {
          return;
        }
        onClose();
      }}
      variant="small"
      aria-label="Stop evaluation?"
      data-testid="evaluation-stop-modal"
    >
      <ModalHeader title="Stop evaluation?" titleIconVariant="warning" />
      <ModalBody>
        {actionError && (
          <Alert variant="danger" isInline isPlain title={actionError} className="pf-v6-u-mb-md" />
        )}
        {`The ${evaluationName} evaluation will be stopped, and its progress will be lost.`}
      </ModalBody>
      <ModalFooter>
        <Button
          variant="danger"
          onClick={handleConfirm}
          isLoading={isSubmitting}
          isDisabled={isSubmitting}
          data-testid="evaluation-stop-confirm"
        >
          Stop evaluation
        </Button>
        <Button
          variant="link"
          onClick={onClose}
          isDisabled={isSubmitting}
          data-testid="evaluation-stop-cancel"
        >
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default StopEvaluationModal;
