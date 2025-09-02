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
import {
  getStatusFromCondition,
  messageForCondition,
} from '#~/concepts/pipelines/content/utils.tsx';
import PipelineComponentStatusIcon, {
  StatusType,
} from '#~/concepts/pipelines/content/PipelineComponentStatusIcon.tsx';
import { K8sCondition, K8sDspaConditionReason } from '#~/k8sTypes';
import { useWatchAllPodEventsAndFilter } from '#~/concepts/pipelines/context/usePipelineEvents.ts';
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

  const onDelete = () => {
    console.log('would delete pipeline server here....todo');
  };

  console.log(
    'StartingStatusModal; namespace/pipelinesServer.name:',
    namespace,
    pipelinesServer.name,
  );
  // Use the custom hook to get all events
  const allEvents = useWatchAllPodEventsAndFilter(namespace);

  const spinner = (
    <Flex>
      <FlexItem>Initializing Pipeline Server</FlexItem>
      <FlexItem>
        <Spinner size="lg" />
      </FlexItem>
    </Flex>
  );

  const statusConditions: [StatusType, string, K8sCondition][] | undefined =
    pipelinesServer.crStatus?.conditions
      ?.filter(
        (unfilteredCondition) =>
          unfilteredCondition.reason !== K8sDspaConditionReason.NotApplicable,
      )
      .map((condition) => {
        const containerStatus = getStatusFromCondition(condition);
        return [containerStatus, messageForCondition(condition.type), condition];
      });

  // Find all error conditions
  const errorConditions: [string, K8sCondition][] =
    statusConditions
      ?.filter((contents1) => contents1[0] === StatusType.ERROR)
      .map((contents) => [contents[1], contents[2]]) || [];

  const serverErroredOut = errorConditions.some((c) => c[1].type === 'Ready');

  const renderProgress = () => (
    <Panel isScrollable>
      <PanelMain>
        {/* Render an Alert for each error condition  that has a message*/}
        {errorConditions
          .filter((c) => c[1].message)
          .map(([humanReadableCondition, condition], idx) => (
            <Alert
              data-testid={`error-${idx}`}
              key={condition.type + idx}
              variant="danger"
              title={`${humanReadableCondition} - ${condition.reason || 'Unknown'}` || 'Error'}
              style={{ marginBottom: 16 }}
            >
              {condition.message}
            </Alert>
          ))}
        <Stack hasGutter>
          <StackItem>
            <Stack hasGutter>
              {statusConditions?.map(
                ([containerStatus, humanReadableCondition, condition], index) => (
                  <StackItem key={`${condition.type}-${index}`}>
                    <Flex>
                      <FlexItem>
                        <PipelineComponentStatusIcon status={containerStatus} />
                      </FlexItem>
                      <FlexItem>
                        <Content>{humanReadableCondition}</Content>
                      </FlexItem>
                    </Flex>
                  </StackItem>
                ),
              )}
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
    <Panel isScrollable>
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

  const errorDesc = (
    <Content data-testid="errorDescription">
      We encountered an error creating your pipeline server. Close this modal to see further
      instructions.
    </Content>
  );

  const modalTitle = serverErroredOut
    ? 'Pipeline Initialization Failed'
    : isServerReadyAndCompletelyDone
    ? 'Pipeline Server Initialized'
    : spinner;

  const modalDesc = serverErroredOut
    ? errorDesc
    : isServerReadyAndCompletelyDone
    ? successDesc
    : inProgressDesc;

  return (
    <Modal
      data-testid="pipeline-server-starting-modal"
      isOpen
      variant="medium"
      onClose={onClose}
      title="Pipeline Server Status"
      disableFocusTrap
    >
      <ModalHeader title={modalTitle} description={modalDesc} />
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
        <Button variant="primary" onClick={onDelete}>
          Delete pipeline server
        </Button>
        <Button variant="primary" onClick={onClose}>
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default StartingStatusModal;
