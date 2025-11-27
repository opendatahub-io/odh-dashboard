import * as React from 'react';
import {
  Modal,
  ModalVariant,
  ModalHeader,
  ModalBody,
  ModalFooter,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  StackItem,
  Stack,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import DashboardModalFooter from '@odh-dashboard/internal/concepts/dashboard/DashboardModalFooter';
import NumberInputWrapper from '@odh-dashboard/internal/components/NumberInputWrapper';
import { TrainJobKind } from '../../k8sTypes';

type ScaleNodesModalProps = {
  job?: TrainJobKind;
  currentNodeCount: number;
  isScaling: boolean;
  onClose: () => void;
  onConfirm: (newNodeCount: number) => void;
};

const ScaleNodesModal: React.FC<ScaleNodesModalProps> = ({
  job,
  currentNodeCount,
  isScaling,
  onClose,
  onConfirm,
}) => {
  const [nodeCount, setNodeCount] = React.useState<number>(currentNodeCount);
  const [error, setError] = React.useState<string>('');

  React.useEffect(() => {
    setNodeCount(currentNodeCount);
    setError('');
  }, [currentNodeCount, job]);

  if (!job) {
    return null;
  }

  const displayName = getDisplayNameFromK8sResource(job);
  const isValid = nodeCount > 0 && nodeCount !== currentNodeCount;

  const handleSubmit = () => {
    if (!isValid) {
      setError('Please enter a valid number of nodes different from the current value.');
      return;
    }
    onConfirm(nodeCount);
  };

  return (
    <Modal variant={ModalVariant.small} isOpen onClose={onClose} data-testid="scale-nodes-modal">
      <ModalHeader title="Edit node count" />
      <ModalBody>
        <Stack hasGutter>
          <StackItem>
            Edit the total number of worker nodes allocated to the <strong>{displayName}</strong>{' '}
            training job.
          </StackItem>
          <StackItem>
            <FormGroup label="Nodes" fieldId="node-count">
              <NumberInputWrapper
                inputProps={{
                  id: 'node-count',
                  'data-testid': 'node-count-input',
                }}
                inputName="node-count"
                value={nodeCount}
                min={1}
                onChange={(value) => {
                  setNodeCount(value ?? 1);
                  setError('');
                }}
                validated={error ? 'error' : 'default'}
              />
              {error && (
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem icon={<ExclamationCircleIcon />} variant="error">
                      {error}
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              )}
            </FormGroup>
          </StackItem>
        </Stack>
      </ModalBody>
      <ModalFooter>
        <DashboardModalFooter
          onCancel={onClose}
          onSubmit={handleSubmit}
          submitLabel="Save"
          submitButtonVariant="primary"
          isSubmitLoading={isScaling}
          isSubmitDisabled={isScaling || !isValid}
          isCancelDisabled={isScaling}
        />
      </ModalFooter>
    </Modal>
  );
};

export default ScaleNodesModal;
