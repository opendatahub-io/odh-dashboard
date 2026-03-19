import * as React from 'react';
import {
  Form,
  FormGroup,
  FormGroupLabelHelp,
  Popover,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import ContentModal from '@odh-dashboard/internal/components/modals/ContentModal';
import NumberInputWrapper from '@odh-dashboard/internal/components/NumberInputWrapper';
import { WorkerGroupReplicaState } from '../../hooks/useRayJobNodeScaling';

type ScaleRayJobNodesModalProps = {
  jobName: string;
  workerGroupReplicas: WorkerGroupReplicaState[];
  hasChanges: boolean;
  isScaling: boolean;
  onClose: () => void;
  onSave: () => Promise<void>;
  onReplicaChange: (groupName: string, newReplicas: number) => void;
};

const ScaleRayJobNodesModal: React.FC<ScaleRayJobNodesModalProps> = ({
  jobName,
  workerGroupReplicas,
  hasChanges,
  isScaling,
  onClose,
  onSave,
  onReplicaChange,
}) => (
  <ContentModal
    title="Edit node count"
    variant="small"
    dataTestId="edit-ray-job-node-count-modal"
    onClose={onClose}
    contents={
      <Stack hasGutter>
        <StackItem>
          Edit the number of worker nodes allocated to the <strong>{jobName}</strong> job.
        </StackItem>
        <StackItem>
          <Form>
            <FormGroup
              label="Head node"
              fieldId="head-node-count"
              labelHelp={
                <Popover bodyContent="Every RayJob has 1 head node. This number is not editable.">
                  <FormGroupLabelHelp
                    aria-label="More info for head node field"
                    data-testid="head-node-info-popover"
                  />
                </Popover>
              }
            >
              <NumberInputWrapper
                inputProps={{
                  id: 'head-node-count',
                  'aria-label': 'Head node count',
                  'data-testid': 'head-node-count-input',
                }}
                inputName="head-node-count"
                value={1}
                widthChars={3}
                isDisabled
                minusBtnProps={{ style: { display: 'none' } }}
                plusBtnProps={{ style: { display: 'none' } }}
              />
            </FormGroup>
            {workerGroupReplicas.map((wg) => (
              <FormGroup
                key={wg.groupName}
                label={`${wg.groupName} nodes`}
                fieldId={`worker-group-${wg.groupName}`}
              >
                <NumberInputWrapper
                  inputProps={{
                    id: `worker-group-${wg.groupName}`,
                    'aria-label': `${wg.groupName} node count`,
                    'data-testid': `worker-group-input-${wg.groupName}`,
                  }}
                  inputName={`worker-group-${wg.groupName}`}
                  value={wg.replicas}
                  widthChars={4}
                  min={0}
                  minusBtnProps={{
                    isDisabled: wg.replicas <= 0,
                    'aria-label': `Decrease ${wg.groupName} node count`,
                  }}
                  plusBtnProps={{
                    'aria-label': `Increase ${wg.groupName} node count`,
                  }}
                  onChange={(value) => onReplicaChange(wg.groupName, value ?? 0)}
                />
              </FormGroup>
            ))}
          </Form>
        </StackItem>
      </Stack>
    }
    buttonActions={[
      {
        label: 'Save',
        variant: 'primary',
        isLoading: isScaling,
        isDisabled: isScaling || !hasChanges,
        onClick: onSave,
      },
      {
        label: 'Cancel',
        variant: 'link',
        isDisabled: isScaling,
        onClick: onClose,
      },
    ]}
  />
);

export default ScaleRayJobNodesModal;
