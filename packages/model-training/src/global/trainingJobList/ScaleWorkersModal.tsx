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
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
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
  onConfirmAndResume: (newWorkerCount: number) => Promise<void>;
  isLoading?: boolean;
}

const ScaleWorkersModal: React.FC<ScaleWorkersModalProps> = ({
  job,
  jobStatus,
  isOpen,
  onClose,
  onConfirm,
  onConfirmAndResume,
  isLoading = false,
}) => {
  const currentWorkerReplicas = job.spec.pytorchReplicaSpecs.Worker?.replicas || 0;
  console.log('currentWorkerReplicas', currentWorkerReplicas);
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

  const isPaused = jobStatus === PyTorchJobState.PAUSED;
  const hasChanges = newWorkerCount !== currentWorkerReplicas;
  const resourceDelta = newWorkerCount - currentWorkerReplicas;

  // Estimated resource impact (these would typically come from job spec or cluster configs)
  const estimatedResourcesPerWorker = {
    gpu: 1,
    cpu: '4',
    memory: '8Gi',
  };

  const resourceImpact = {
    gpu: resourceDelta * estimatedResourcesPerWorker.gpu,
    cpu: `${resourceDelta > 0 ? '+' : ''}${Math.abs(resourceDelta) * 4}`,
    memory: `${resourceDelta > 0 ? '+' : ''}${Math.abs(resourceDelta) * 8}Gi`,
  };

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
          {!isPaused && (
            <StackItem>
              <Alert
                variant="warning"
                title="Job must be paused"
                className="pf-u-mb-md"
                customIcon={<ExclamationTriangleIcon />}
              >
                Worker replicas can only be modified when the training job is in a paused state.
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
                  isDisabled={!isPaused}
                  validated={validationError ? 'error' : 'default'}
                />

                {validationError && <div>{validationError}</div>}
              </FormGroup>
            </Form>
          </StackItem>

          {/* Resource Impact */}
          <StackItem>
            {hasChanges && isPaused && (
              <Alert
                variant={resourceDelta > 0 ? 'info' : 'warning'}
                title="Estimated Resource Impact"
                isInline
              >
                <DescriptionList isHorizontal isCompact>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Worker Change</DescriptionListTerm>
                    <DescriptionListDescription>
                      <strong>
                        {resourceDelta > 0 ? '+' : ''}
                        {resourceDelta} workers
                      </strong>
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>GPU Impact</DescriptionListTerm>
                    <DescriptionListDescription>
                      {resourceImpact.gpu > 0 ? '+' : ''}
                      {resourceImpact.gpu} GPUs
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>CPU Impact</DescriptionListTerm>
                    <DescriptionListDescription>
                      {resourceImpact.cpu} cores
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Memory Impact</DescriptionListTerm>
                    <DescriptionListDescription>{resourceImpact.memory}</DescriptionListDescription>
                  </DescriptionListGroup>
                </DescriptionList>
              </Alert>
            )}
          </StackItem>
        </Stack>
      </ModalBody>

      <ModalFooter>
        <Button
          variant="primary"
          onClick={handleConfirmAndResume}
          isDisabled={!isPaused || !hasChanges || !!validationError || isLoading}
          isLoading={isLoading}
          icon={<PlayIcon />}
        >
          {isLoading ? 'Scaling and resuming...' : 'Confirm and Resume'}
        </Button>
        <Button
          variant="secondary"
          onClick={handleConfirm}
          isDisabled={!isPaused || !hasChanges || !!validationError || isLoading}
          icon={<SaveIcon />}
        >
          Confirm (Stay Paused)
        </Button>
        <Button variant="link" onClick={onClose} isDisabled={isLoading}>
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default ScaleWorkersModal;
