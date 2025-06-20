import * as React from 'react';
import {
  Modal,
  ModalBody,
  ModalHeader,
  ModalFooter,
  Spinner,
  Stack,
  StackItem,
  Tab,
  Tabs,
  TabTitleText,
  Panel,
  PanelMain,
  Button,
  Flex,
  FlexItem,
  Content,
  Alert,
} from '@patternfly/react-core';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { getStatusFromCondition } from '#~/concepts/pipelines/content/utils.tsx';
import K8sStatusIcon, { StatusType } from '#~/concepts/pipelines/content/K8sStatusIcon.tsx';
import { K8sCondition } from '#~/k8sTypes';
import {
  useWatchPodsForPipelineServerEvents,
  useWatchMultiplePodEvents,
} from '#~/concepts/pipelines/context/usePipelineEvents.ts';
import EventLog from '#~/concepts/k8s/EventLog/EventLog';
import '#~/concepts/dashboard/ModalStyles.scss';

const PROGRESS_TAB = 'Progress';
const EVENT_LOG_TAB = 'Events log';

type StartingStatusModalProps = {
  onClose: () => void;
};

const StartingStatusModal: React.FC<StartingStatusModalProps> = ({ onClose }) => {
  const { pipelinesServer, namespace } = usePipelinesAPI();
  const [activeTab, setActiveTab] = React.useState<string>(PROGRESS_TAB);
  const isServerReadyAndCompletelyDone = pipelinesServer.crStatus?.conditions?.some(
    (c) => c.type === 'Ready' && c.status === 'True',
  );

  const [pods] = useWatchPodsForPipelineServerEvents(namespace);
  const podUids = pods.map((onePod) => onePod.metadata.uid);

  // Use the custom hook to get all events
  const allEvents = useWatchMultiplePodEvents(
    namespace,
    podUids.filter((uid): uid is string => uid !== undefined),
  );

  const spinner = (
    <Flex>
      <FlexItem>Initializing Pipeline Server</FlexItem>
      <FlexItem>
        <Spinner size="lg" />
      </FlexItem>
    </Flex>
  );

  const statusConditions: [StatusType, K8sCondition][] | undefined =
    pipelinesServer.crStatus?.conditions?.map((condition) => {
      const containerStatus = getStatusFromCondition(condition);
      return [containerStatus, condition];
    });

  // Find all error conditions
  const errorConditions: K8sCondition[] =
    statusConditions
      ?.filter((contents1) => contents1[0] === StatusType.ERROR)
      .map((contents) => contents[1]) || [];

  const renderProgress = () => (
    <Panel className="odh-modal__scrollable-panel">
      <PanelMain>
        {/* Render an Alert for each error condition */}
        {errorConditions.map((condition, idx) => (
          <Alert
            key={condition.type + idx}
            variant="danger"
            title={
              `$676916
              {condition.type} - ${condition.reason || 'Unknown'}` || 'Error'
            }
            style={{ marginBottom: 16 }}
          >
            {condition.message || 'An error occurred.'}
          </Alert>
        ))}
        <Stack hasGutter>
          <StackItem>
            <Stack hasGutter>
              {statusConditions?.map(([containerStatus, condition], index) => (
                <StackItem key={`${condition.type}-${index}`}>
                  <Flex>
                    <FlexItem>
                      <K8sStatusIcon status={containerStatus} />
                    </FlexItem>
                    <FlexItem>
                      <Content>{condition.type}</Content>
                    </FlexItem>
                  </Flex>
                </StackItem>
              ))}
            </Stack>
          </StackItem>
          <StackItem />
          {!isServerReadyAndCompletelyDone && (
            <StackItem>
              <Content>
                This may take a while. You can close this modal and continue using the application.
                The pipeline server will be available when initialization is complete.
              </Content>
            </StackItem>
          )}
        </Stack>
      </PanelMain>
    </Panel>
  );

  const renderLogs = () => (
    <Panel className="odh-modal__scrollable-panel">
      <PanelMain>
        <EventLog
          events={allEvents}
          dataTestId="pipeline-event-logs"
          initialMessage="Initializing Pipeline"
        />
      </PanelMain>
    </Panel>
  );

  const successDesc = (
    <Content data-testid="successDescription">
      The pipeline server has been successfully initialized and is ready to use.
    </Content>
  );
  const inProgressDesc = (
    <Content data-testid="inProgressDescription">
      The pipeline server is currently being initialized. This process may take a few minutes.
      Closing this dialog will not affect the pipeline server creation.
    </Content>
  );
  return (
    <Modal
      data-testid="pipeline-server-starting-modal"
      isOpen
      variant="medium"
      onClose={onClose}
      title="Pipeline Server Status"
      disableFocusTrap
    >
      <ModalHeader
        title={isServerReadyAndCompletelyDone ? 'Pipeline Server Initialized' : spinner}
        description={isServerReadyAndCompletelyDone ? successDesc : inProgressDesc}
      />
      <ModalBody className="odh-modal__content-height">
        <Stack hasGutter>
          <StackItem>
            <Tabs
              activeKey={activeTab}
              onSelect={(_ev, tabIndex) => setActiveTab(`${tabIndex}`)}
              aria-label="status details"
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
                data-testid="expand-logs"
              />
            </Tabs>
          </StackItem>
          <StackItem isFilled className="odh-modal__filled-stack-item">
            {activeTab === PROGRESS_TAB ? renderProgress() : renderLogs()}
          </StackItem>
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button variant="primary" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default StartingStatusModal;
