import React from 'react';
import {
  Button,
  Content,
  ContentVariants,
  Flex,
  FlexItem,
  // eslint-disable-next-line @odh-dashboard/no-restricted-imports -- custom modal with ProgressStepper timeline and embedded status badge; ContentModal does not support this layout
  Modal,
  // eslint-disable-next-line @odh-dashboard/no-restricted-imports
  ModalBody,
  // eslint-disable-next-line @odh-dashboard/no-restricted-imports
  ModalFooter,
  // eslint-disable-next-line @odh-dashboard/no-restricted-imports
  ModalHeader,
  // eslint-disable-next-line @odh-dashboard/no-restricted-imports
  ModalVariant,
  ProgressStep,
  ProgressStepVariant,
  ProgressStepper,
  Spinner,
  Timestamp,
  TimestampTooltipVariant,
} from '@patternfly/react-core';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import { ModelDeploymentState } from '@odh-dashboard/model-serving/shared';
import { ModelStatusIcon } from '@odh-dashboard/model-serving/shared/components';
import type {
  Deployment,
  DeploymentCondition,
  DeploymentConditionStatus,
} from '../../../extension-points';

type DeploymentStatusModalProps = {
  deployment: Deployment;
  onClose: () => void;
  onStopDeployment?: () => void;
  onEditDeployment?: () => void;
  isEditLoading?: boolean;
};

const getStepVariant = (status: DeploymentConditionStatus | undefined): ProgressStepVariant => {
  switch (status) {
    case 'True':
      return ProgressStepVariant.success;
    case 'False':
      return ProgressStepVariant.danger;
    case 'Warning':
      return ProgressStepVariant.warning;
    default:
      return ProgressStepVariant.pending;
  }
};

const ConditionTimestamp: React.FC<{ isoString?: string }> = ({ isoString }) => {
  if (!isoString) {
    return null;
  }
  const date = new Date(isoString);
  return (
    <Timestamp
      date={date}
      tooltip={{ variant: TimestampTooltipVariant.default }}
      dateFormat="long"
      timeFormat="long"
    />
  );
};

const getMessageColor = (status: DeploymentConditionStatus | undefined): string | undefined => {
  switch (status) {
    case 'False':
      return 'var(--pf-t--global--text--color--status--danger--default)';
    case 'Warning':
      return 'var(--pf-t--global--text--color--status--warning--default)';
    default:
      return undefined;
  }
};

const ConditionDescription: React.FC<{
  condition: DeploymentCondition;
}> = ({ condition }) => {
  const messageColor = getMessageColor(condition.status);
  return (
    <>
      <ConditionTimestamp isoString={condition.lastTransitionTime} />
      {(condition.status === 'False' || condition.status === 'Warning') &&
        condition.message &&
        messageColor && (
          <Content component={ContentVariants.small} style={{ color: messageColor }}>
            {condition.message}
          </Content>
        )}
    </>
  );
};

const ConditionChildren: React.FC<{
  children: DeploymentCondition[];
}> = ({ children }) => (
  <ProgressStepper isVertical style={{ paddingTop: 'var(--pf-t--global--spacer--sm)' }}>
    {children.map((child) => (
      <ProgressStep
        key={child.type}
        variant={getStepVariant(child.status)}
        aria-label={`${child.label}: ${child.status ?? 'pending'}`}
        id={`condition-child-${child.type}`}
        titleId={`condition-child-${child.type}-title`}
        description={<ConditionDescription condition={child} />}
        data-testid={`deployment-condition-${child.type}`}
      >
        {child.label}
      </ProgressStep>
    ))}
  </ProgressStepper>
);

const DeploymentStatusModal: React.FC<DeploymentStatusModalProps> = ({
  deployment,
  onClose,
  onStopDeployment,
  onEditDeployment,
  isEditLoading,
}) => {
  const conditions = deployment.status?.conditions ?? [];
  const displayName = getDisplayNameFromK8sResource(deployment.model);

  return (
    <Modal
      appendTo={document.body}
      variant={ModalVariant.medium}
      isOpen
      onClose={onClose}
      data-testid="deployment-status-modal"
    >
      <ModalHeader
        title={
          <Flex gap={{ default: 'gapMd' }} alignItems={{ default: 'alignItemsCenter' }}>
            <FlexItem>Deployment status</FlexItem>
            <FlexItem>
              <ModelStatusIcon
                state={deployment.status?.state ?? ModelDeploymentState.UNKNOWN}
                stoppedStates={deployment.status?.stoppedStates}
                isCompact
              />
            </FlexItem>
          </Flex>
        }
      />
      <ModalBody>
        <Content
          component={ContentVariants.p}
          style={{ marginBottom: 'var(--pf-t--global--spacer--md)' }}
        >
          {displayName}
        </Content>
        <ProgressStepper isVertical data-testid="deployment-status-steps">
          {conditions.map((condition) => (
            <ProgressStep
              key={condition.type}
              variant={getStepVariant(condition.status)}
              aria-label={`${condition.label}: ${condition.status ?? 'pending'}`}
              id={`condition-${condition.type}`}
              titleId={`condition-${condition.type}-title`}
              description={
                <>
                  <ConditionDescription condition={condition} />
                  {condition.children && condition.children.length > 0 && (
                    <ConditionChildren>{condition.children}</ConditionChildren>
                  )}
                </>
              }
              data-testid={`deployment-condition-${condition.type}`}
            >
              {condition.label}
            </ProgressStep>
          ))}
        </ProgressStepper>
      </ModalBody>
      <ModalFooter>
        <Flex gap={{ default: 'gapMd' }}>
          {onStopDeployment && (
            <FlexItem>
              <Button
                variant="primary"
                isDanger
                onClick={onStopDeployment}
                data-testid="deployment-status-stop-button"
              >
                Stop deployment
              </Button>
            </FlexItem>
          )}
          {onEditDeployment && (
            <FlexItem>
              <Button
                variant="link"
                onClick={onEditDeployment}
                isDisabled={isEditLoading}
                icon={isEditLoading ? <Spinner size="sm" /> : undefined}
                data-testid="deployment-status-edit-button"
              >
                {isEditLoading ? 'Loading deployment...' : 'Edit deployment'}
              </Button>
            </FlexItem>
          )}
        </Flex>
      </ModalFooter>
    </Modal>
  );
};

export default DeploymentStatusModal;
