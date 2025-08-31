import React from 'react';
import {
  Alert,
  AlertActionCloseButton,
  Flex,
  FlexItem,
  Content,
  ContentVariants,
  Icon,
} from '@patternfly/react-core';
import { CheckCircleIcon, CubesIcon } from '@patternfly/react-icons';
import { PyTorchJobKind } from '../../../k8sTypes';

interface ScalingNotificationProps {
  job: PyTorchJobKind;
  previousWorkerCount: number;
  newWorkerCount: number;
  wasResumed: boolean;
  onClose: () => void;
}

const ScalingNotification: React.FC<ScalingNotificationProps> = ({
  job,
  previousWorkerCount,
  newWorkerCount,
  wasResumed,
  onClose,
}) => {
  const resourceDelta = newWorkerCount - previousWorkerCount;
  const masterReplicas = job.spec.pytorchReplicaSpecs.Master?.replicas || 0;
  const totalNodes = newWorkerCount + masterReplicas;

  return (
    <Alert
      variant="success"
      title={
        <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem>
            <Icon>
              <CheckCircleIcon />
            </Icon>
          </FlexItem>
          <FlexItem>Workers scaled successfully</FlexItem>
        </Flex>
      }
      actionClose={<AlertActionCloseButton onClose={onClose} />}
      className="pf-u-mb-md"
    >
      <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
        <FlexItem>
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            spaceItems={{ default: 'spaceItemsSm' }}
          >
            <FlexItem>
              <Icon>
                <CubesIcon />
              </Icon>
            </FlexItem>
            <FlexItem>
              <Content component={ContentVariants.p}>
                <strong>{job.metadata.name}</strong> now has{' '}
                <strong>
                  {newWorkerCount} worker{newWorkerCount !== 1 ? 's' : ''}
                </strong>{' '}
                ({totalNodes} total nodes)
              </Content>
            </FlexItem>
          </Flex>
        </FlexItem>

        <FlexItem>
          <Content component={ContentVariants.small}>
            {resourceDelta > 0 ? (
              <>
                ⬆️ Scaled up by <strong>+{resourceDelta}</strong> worker
                {resourceDelta !== 1 ? 's' : ''}
              </>
            ) : (
              <>
                ⬇️ Scaled down by <strong>{resourceDelta}</strong> worker
                {Math.abs(resourceDelta) !== 1 ? 's' : ''}
              </>
            )}
            {wasResumed && (
              <>
                {' '}
                and job has been <strong>resumed</strong>
              </>
            )}
          </Content>
        </FlexItem>

        {!wasResumed && (
          <FlexItem>
            <Content component={ContentVariants.small} className="pf-u-color-200">
              💡 Job remains paused. Resume it to start training with the new configuration.
            </Content>
          </FlexItem>
        )}
      </Flex>
    </Alert>
  );
};

export default ScalingNotification;
