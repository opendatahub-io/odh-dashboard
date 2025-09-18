import React from 'react';
import {
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Form,
  FormGroup,
  Alert,
  Flex,
  FlexItem,
  Icon,
  StackItem,
  Stack,
} from '@patternfly/react-core';
import { ExclamationTriangleIcon, PlayIcon, SaveIcon, CubesIcon } from '@patternfly/react-icons';
import NumberInputWrapper from '@odh-dashboard/internal/components/NumberInputWrapper';
import { PyTorchJobKind } from '../../k8sTypes';
import { PyTorchJobState } from '../../types';

interface ScaleWorkersModalProps {
  job: PyTorchJobKind;
  jobStatus: PyTorchJobState;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (newWorkerCount: number) => Promise<void>;
  onConfirmOnly: (newWorkerCount: number) => Promise<void>;
  onConfirmAndResume: (newWorkerCount: number) => Promise<void>;
  isLoading?: boolean;
  isNotPaused: boolean;
}

const ScaleWorkersModal: React.FC<ScaleWorkersModalProps> = ({
  job,
  jobStatus,
  isOpen,
  onClose,
  onConfirm,
  onConfirmAndResume,
  onConfirmOnly,
  isLoading = false,
  isNotPaused,
}) => {
  const currentWorkerReplicas = job.spec.pytorchReplicaSpecs.Worker?.replicas || 0;
  const [newWorkerCount, setNewWorkerCount] = React.useState(currentWorkerReplicas);
  const [validationError, setValidationError] = React.useState<string>('');

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setNewWorkerCount(currentWorkerReplicas);
      setValidationError('');
    }
  }, [isOpen, currentWorkerReplicas]);

  const validateWorkerCount = (count: number): boolean => {
    if (count < 1) {
      setValidationError('Worker replicas must be at least 1');
      return false;
    }
    if (count > 100) {
      setValidationError('Worker replicas cannot exceed 100');
      return false;
    }
    if (count === currentWorkerReplicas) {
      setValidationError('New worker count must be different from current count');
      return false;
    }
    setValidationError('');
    return true;
  };

  const handleWorkerCountChange = (value?: number) => {
    if (value !== undefined) {
      setNewWorkerCount(value);
      validateWorkerCount(value);
    } else {
      setValidationError('Please enter a valid number');
    }
  };

  const handleConfirm = async () => {
    if (validateWorkerCount(newWorkerCount)) {
      try {
        await onConfirm(newWorkerCount);
        onClose();
      } catch (error) {
        console.error('Failed to scale workers:', error);
        setValidationError('Failed to update worker replicas. Please try again.');
      }
    }
  };

  const handleConfirmAndResume = async () => {
    if (validateWorkerCount(newWorkerCount)) {
      try {
        await onConfirmAndResume(newWorkerCount);
        onClose();
      } catch (error) {
        console.error('Failed to scale workers and resume:', error);
        setValidationError('Failed to update worker replicas and resume job. Please try again.');
      }
    }
  };

  const handleConfirmOnly = async () => {
    if (validateWorkerCount(newWorkerCount)) {
      try {
        await onConfirmOnly(newWorkerCount);
        onClose();
      } catch (error) {
        console.error('Failed to scale workers and resume:', error);
        setValidationError('Failed to update worker replicas and resume job. Please try again.');
      }
    }
  };

  const isTerminalState =
    jobStatus === PyTorchJobState.SUCCEEDED || jobStatus === PyTorchJobState.FAILED;
  const isPaused = jobStatus === PyTorchJobState.PAUSED;
  const hasChanges = newWorkerCount !== currentWorkerReplicas;

  return (
    <Modal variant="medium" isOpen onClose={onClose}>
      <ModalHeader
        title={
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            spaceItems={{ default: 'spaceItemsSm' }}
          >
            <FlexItem>
              <Icon>
                <CubesIcon />
              </Icon>
            </FlexItem>
            <FlexItem>Scale Worker Replicas</FlexItem>
          </Flex>
        }
      />
      <ModalBody id="scale-workers-description">
        <Stack hasGutter>
          {isTerminalState && (
            <StackItem>
              <Alert
                variant="warning"
                title="Cannot scale completed jobs"
                className="pf-u-mb-md"
                customIcon={<ExclamationTriangleIcon />}
              >
                Worker replicas cannot be modified for jobs that have succeeded or failed.
              </Alert>
            </StackItem>
          )}

          {!isPaused && !isTerminalState && (
            <StackItem>
              <Alert
                variant="info"
                title="Job will be paused during scaling"
                className="pf-u-mb-md"
              >
                The training job is currently {jobStatus.toLowerCase()}. It will be paused to safely
                scale the worker replicas, then you can choose to resume it.
              </Alert>
            </StackItem>
          )}

          <StackItem>
            <Form>
              <FormGroup label="New Worker Replicas" fieldId="worker-replicas">
                <NumberInputWrapper
                  id="worker-replicas"
                  data-testid="worker-replicas"
                  value={newWorkerCount}
                  onChange={handleWorkerCountChange}
                  min={1}
                  max={100}
                  isDisabled={isTerminalState}
                  validated={validationError ? 'error' : 'default'}
                />

                {validationError && <div>{validationError}</div>}
              </FormGroup>
            </Form>
          </StackItem>
        </Stack>
      </ModalBody>

      <ModalFooter>
        {isNotPaused && (
          <Button
            variant="primary"
            onClick={handleConfirmOnly}
            isDisabled={isTerminalState || !hasChanges || !!validationError || isLoading}
            isLoading={isLoading}
            icon={<PlayIcon />}
          >
            {isLoading ? 'Scaling and resuming...' : 'Confirm'}
          </Button>
        )}
        {!isNotPaused && (
          <Button
            variant="primary"
            onClick={handleConfirmAndResume}
            isDisabled={isTerminalState || !hasChanges || !!validationError || isLoading}
            isLoading={isLoading}
            icon={<PlayIcon />}
          >
            {isLoading ? 'Scaling and resuming...' : 'Confirm and Resume'}
          </Button>
        )}
        {!isNotPaused && (
          <Button
            variant="secondary"
            onClick={handleConfirm}
            isDisabled={isTerminalState || !hasChanges || !!validationError || isLoading}
            icon={<SaveIcon />}
          >
            Confirm (Stay Paused)
          </Button>
        )}
        <Button variant="link" onClick={onClose} isDisabled={isLoading}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default ScaleWorkersModal;
