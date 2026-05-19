/* eslint-disable @odh-dashboard/no-restricted-imports */
import React from 'react';
import {
  Content,
  Flex,
  FlexItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  ProgressStep,
  ProgressStepper,
  ProgressStepVariant,
  Stack,
  StackItem,
  Tab,
  Tabs,
  TabTitleText,
} from '@patternfly/react-core';
import { ResolvedExtension } from '@openshift/dynamic-plugin-sdk';
import { ModelStatusIcon } from '@odh-dashboard/internal/concepts/modelServing/ModelStatusIcon';
import { ModelDeploymentState } from '@odh-dashboard/internal/pages/modelServing/screens/types';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import DeploymentEventLog from './DeploymentEventLog';
import { useResolvedDeploymentExtension } from '../../concepts/extensionUtils';
import { useWatchDeploymentEvents } from '../../concepts/useWatchDeploymentEvents';
import {
  Deployment,
  DeploymentProgressStep,
  isModelServingDeploymentProgressSteps,
  ModelServingDeploymentProgressStepsExtension,
} from '../../../extension-points';
import './DeploymentStatusModal.scss';

const PROGRESS_TAB = 'Progress';
const EVENT_LOG_TAB = 'Events log';

const progressStepVariants: Record<DeploymentProgressStep['status'], ProgressStepVariant> = {
  pending: ProgressStepVariant.pending,
  success: ProgressStepVariant.success,
  danger: ProgressStepVariant.danger,
  warning: ProgressStepVariant.warning,
  info: ProgressStepVariant.info,
};

type DeploymentStatusModalProps = {
  deployment: Deployment;
  onClose: () => void;
  buttons: React.ReactNode;
};

const ProgressStepsList: React.FC<{ steps: DeploymentProgressStep[] }> = ({ steps }) => (
  <ProgressStepper isVertical data-testid="deployment-progress-steps">
    {steps.map((step) => (
      <ProgressStep
        key={step.id}
        variant={progressStepVariants[step.status]}
        aria-label={step.status}
        id={step.id}
        titleId={`${step.id}-title`}
        description={step.description}
        data-testid={`progress-step-${step.id}`}
      >
        {step.title}
        {step.children && step.children.length > 0 ? (
          <ProgressStepsList steps={step.children} />
        ) : null}
      </ProgressStep>
    ))}
  </ProgressStepper>
);

type ResolvedProgressTabProps = {
  deployment: Deployment;
  extension: ResolvedExtension<ModelServingDeploymentProgressStepsExtension>;
};

const ResolvedProgressTab: React.FC<ResolvedProgressTabProps> = ({ deployment, extension }) => {
  const progressSteps = extension.properties.useProgressSteps(deployment);

  if (progressSteps.length === 0) {
    return (
      <Content data-testid="no-progress-steps">
        No progress information available for this deployment.
      </Content>
    );
  }

  return (
    <Flex direction={{ default: 'column' }} gap={{ default: 'gapMd' }} style={{ height: '100%' }}>
      <FlexItem flex={{ default: 'flex_1' }} style={{ overflowY: 'scroll', minHeight: 0 }}>
        <ProgressStepsList steps={progressSteps} />
      </FlexItem>
    </Flex>
  );
};

const DeploymentStatusModal: React.FC<DeploymentStatusModalProps> = ({
  deployment,
  onClose,
  buttons,
}) => {
  const [activeTab, setActiveTab] = React.useState<string>(PROGRESS_TAB);
  const { namespace } = deployment.model.metadata;
  const { name: deploymentName } = deployment.model.metadata;

  const [progressStepsExtension, extensionLoaded] = useResolvedDeploymentExtension(
    isModelServingDeploymentProgressSteps,
    deployment,
  );

  const [events, eventsLoaded] = useWatchDeploymentEvents(namespace);

  const renderProgress = () => {
    if (!extensionLoaded) {
      return <Content>Loading progress...</Content>;
    }
    if (!progressStepsExtension) {
      return (
        <Content data-testid="no-progress-steps">
          No progress information available for this deployment.
        </Content>
      );
    }
    return <ResolvedProgressTab deployment={deployment} extension={progressStepsExtension} />;
  };

  const renderEvents = () => (
    <DeploymentEventLog events={events} deploymentName={deploymentName} loaded={eventsLoaded} />
  );

  return (
    <Modal
      appendTo={document.body}
      variant={ModalVariant.medium}
      isOpen
      onClose={onClose}
      data-testid="deployment-status-modal"
    >
      <ModalHeader
        data-testid="deployment-status-modal-header"
        title={
          <Flex gap={{ default: 'gapMd' }} alignItems={{ default: 'alignItemsCenter' }}>
            <FlexItem>Deployment status</FlexItem>
            <FlexItem>
              <ModelStatusIcon
                state={deployment.status?.state ?? ModelDeploymentState.UNKNOWN}
                stoppedStates={deployment.status?.stoppedStates}
              />
            </FlexItem>
          </Flex>
        }
      />
      <ModalBody className="deployment-status-modal__content-height">
        <Stack hasGutter style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <StackItem>
            <Content component="p" data-testid="deployment-status-name">
              {getDisplayNameFromK8sResource(deployment.model)}
            </Content>
          </StackItem>
          <StackItem>
            <Tabs
              activeKey={activeTab}
              onSelect={(_ev, tabIndex) => setActiveTab(`${tabIndex}`)}
              aria-label="deployment status details"
            >
              <Tab
                eventKey={PROGRESS_TAB}
                aria-label={PROGRESS_TAB}
                title={<TabTitleText>{PROGRESS_TAB}</TabTitleText>}
                data-testid="expand-progress"
              />
              <Tab
                eventKey={EVENT_LOG_TAB}
                aria-label={EVENT_LOG_TAB}
                title={<TabTitleText>{EVENT_LOG_TAB}</TabTitleText>}
                data-testid="expand-events"
              />
            </Tabs>
          </StackItem>
          <StackItem isFilled className="deployment-status-modal__filled-stack-item">
            {activeTab === PROGRESS_TAB ? renderProgress() : renderEvents()}
          </StackItem>
        </Stack>
      </ModalBody>
      <ModalFooter>{buttons}</ModalFooter>
    </Modal>
  );
};

export default DeploymentStatusModal;
