import * as React from 'react';
import { Alert, Button, Modal, ModalBody, ModalFooter, ModalHeader } from '@patternfly/react-core';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { EvaluationJob } from '~/app/types';
import { EVAL_HUB_EVENTS } from '~/app/tracking/evalhubTrackingConstants';
import { buildRetryRequest, getEvaluationName } from '~/app/utilities/evaluationUtils';
import { createEvaluationJob } from '~/app/api/k8s';

type RetryEvaluationModalProps = {
  job: EvaluationJob;
  namespace: string;
  onClose: () => void;
  onComplete: () => void;
};

const RetryEvaluationModal: React.FC<RetryEvaluationModalProps> = ({
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
      await createEvaluationJob('', namespace, buildRetryRequest(job))({});
      fireMiscTrackingEvent(EVAL_HUB_EVENTS.EVALUATION_RETRIED, {
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
      aria-label="Retry evaluation?"
      data-testid="evaluation-retry-modal"
    >
      <ModalHeader title="Retry evaluation?" />
      <ModalBody>
        {actionError && (
          <Alert variant="danger" isInline isPlain title={actionError} className="pf-v6-u-mb-md" />
        )}
        {`The ${evaluationName} evaluation will be resubmitted with the same configuration.`}
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={handleConfirm}
          isLoading={isSubmitting}
          isDisabled={isSubmitting}
          data-testid="evaluation-retry-confirm"
        >
          Retry evaluation
        </Button>
        <Button
          variant="link"
          onClick={onClose}
          isDisabled={isSubmitting}
          data-testid="evaluation-retry-cancel"
        >
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default RetryEvaluationModal;
