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
  conditionLog: K8sCondition[];
};

// because you can close and re-open this modal; and the 'status' tab only needs to show the current conditions;
// but the 'event log' tab should show everything (from before the user opens the modal)
// need to get the events from the parent that already/always exists.
// (this component only exists when it is open): eslint rules do not allow this component to exist if it not open
const StartingStatusModal: React.FC<StartingStatusModalProps> = ({ onClose, conditionLog }) => {
  const { pipelinesServer } = usePipelinesAPI();
  const [activeTab, setActiveTab] = React.useState<string>(PROGRESS_TAB);
  const isServerReadyAndCompletelyDone = pipelinesServer.crStatus?.conditions?.some(
    (c) => c.type === 'Ready' && c.status === 'True',
  );

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

  const successDesc = (
    <span data-testid="successDescription">
      The pipeline server has been successfully initialized and is ready to use.
    </span>
  );
  const inProgressDesc = (
    <span data-testid="inProgressDescription">
      The pipeline server is currently being initialized. This process may take a few minutes.
      Closing this dialog will not affect the pipeline server creation; this just shows the status.
    </span>
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
