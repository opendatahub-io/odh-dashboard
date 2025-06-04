import * as React from 'react';
import {
  Bullseye,
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
  List,
  ListItem,
  Button,
} from '@patternfly/react-core';
import { usePipelinesAPI } from '#~/concepts/pipelines/context';
import { getStatusFromCondition } from '#~/concepts/pipelines/content/utils.tsx';
import K8sStatusIcon from '#~/concepts/pipelines/content/K8sStatusIcon.tsx';
import { K8sCondition } from '#~/k8sTypes.ts';

const PROGRESS_TAB = 'Progress';
const EVENT_LOG_TAB = 'Events log';
// const readyText = 'Ready: True - All components are ready.';
// status: "True"
// type: "Ready"

// not quite ready yet......
const notReadySection = (
  <div>
    <p style={{ textAlign: 'center' }} />
    <div>
      This may take a while. You can close this modal and continue using the application. The
      pipeline server will be available when initialization is complete.
    </div>
  </div>
);

const CONTENT_HEIGHT = 470;

type StartingStatusModalProps = {
  onClose: () => void;
};

const StartingStatusModal: React.FC<StartingStatusModalProps> = ({ onClose }) => {
  const { pipelinesServer } = usePipelinesAPI();
  const [activeTab, setActiveTab] = React.useState<string>(PROGRESS_TAB);
  const isApiServerReady = pipelinesServer.crStatus?.conditions?.some(
    (c) => c.type === 'APIServerReady' && c.status === 'True',
  );
  const isServerReadyAndCompletelyDone = pipelinesServer.crStatus?.conditions?.some(
    (c) => c.type === 'Ready' && c.status === 'True',
  );

  const [conditionLog, setConditionLog] = React.useState<K8sCondition[]>([]);

  // Update conditionLog whenever conditions change
  React.useEffect(() => {
    if (pipelinesServer.crStatus?.conditions) {
      console.log('new conditions:', JSON.stringify(pipelinesServer.crStatus.conditions, null, 2));

      // Create a new array with reversed conditions
      const reversedConditions = [...pipelinesServer.crStatus.conditions].reverse();
      // Add to the top of conditionLog
      setConditionLog((prevLog) => [...reversedConditions, ...prevLog]);
    }
  }, [pipelinesServer.crStatus?.conditions]);

  const spinner = (
    <div className="pf-v6-u-display-flex">
      <div className="pf-v6-u-mr-md">Initializing Pipeline Server</div>
      <Spinner size="lg" />
    </div>
  );

  const renderProgress = () => (
    <Stack hasGutter>
      <StackItem>
        <Stack hasGutter>
          {pipelinesServer.crStatus?.conditions?.map((condition) => {
            const containerStatus = getStatusFromCondition(condition);
            return (
              <StackItem key={condition.type}>
                <div>
                  <K8sStatusIcon status={containerStatus} /> {condition.type}
                </div>
              </StackItem>
            );
          })}
        </Stack>
      </StackItem>
      <StackItem />
      {!isServerReadyAndCompletelyDone && notReadySection}
    </Stack>
  );

  const renderLogs = () => (
    <Panel style={{ overflowY: 'auto', height: '100%' }}>
      <PanelMain>
        <List isPlain isBordered data-id="event-logs">
          {conditionLog.map((condition, index) => (
            <ListItem key={`pipeline-condition-${condition.type}-${index}`}>
              {condition.type}: {condition.status} - {condition.message || 'No message'}
            </ListItem>
          ))}
        </List>
      </PanelMain>
    </Panel>
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
        description={
          isServerReadyAndCompletelyDone
            ? 'The pipeline server has been successfully initialized and is ready to use.'
            : 'The pipeline server is currently being initialized. This process may take a few minutes.'
        }
      />
      <ModalBody style={{ height: CONTENT_HEIGHT, overflowY: 'hidden' }}>
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
          <StackItem isFilled style={{ overflowY: 'hidden' }}>
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
