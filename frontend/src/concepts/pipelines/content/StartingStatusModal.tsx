import * as React from 'react';
import {
  Modal,
  ModalBody,
  ModalHeader,
  ModalFooter,
  Bullseye,
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

  const spinner = (
    <StackItem>
      <Bullseye>
        <Spinner size="lg" />
        <div className="pf-v6-u-pl-sm">Initializing Pipeline Server </div>
      </Bullseye>
    </StackItem>
  );

  const apiReady = (
    <StackItem>
      <Bullseye>
        <div>
          The Pipeline Server API is Ready to Use, although the entire server is still initializing
        </div>
      </Bullseye>
    </StackItem>
  );

  const allReady = (
    <StackItem>
      <Bullseye>
        <div> Pipeline Server is all done initializing and ready to use.</div>
      </Bullseye>
    </StackItem>
  );

  const upperMessage = isServerReadyAndCompletelyDone
    ? allReady
    : isApiServerReady
    ? apiReady
    : spinner;


  const renderProgress = () => (
    <Stack hasGutter>
      <StackItem>
        <Bullseye style={{ minHeight: 150 }}>
          <Stack hasGutter>
            {upperMessage}
            {pipelinesServer.crStatus?.conditions?.map((condition) => (
              <StackItem key={condition.type}>
                <div>
                  <p style={{ textAlign: 'center' }}>
                    {condition.type}: {condition.status} - {condition.message || 'No message'}
                  </p>
                </div>
              </StackItem>
            ))}
          </Stack>
        </Bullseye>
      </StackItem>
      <StackItem />
      {!isServerReadyAndCompletelyDone && notReadySection}
    </Stack>
  );

  const debugRenderLogs = () => {
    pipelinesServer.crStatus?.conditions?.forEach((condition, index) => {
      console.log('condition???', index, condition.type, condition.status, condition);
    });
  };

  const renderLogs = () => (
    <Panel style={{ overflowY: 'auto', height: '100%' }}>
      <PanelMain>
        <List isPlain isBordered data-id="event-logs">
          <ListItem>Pipeline server initialization started</ListItem>
          {pipelinesServer.crStatus?.conditions?.map((condition, index) => (
            <ListItem key={`pipeline-condition-${condition.type}-${index}`}>
              {condition.type}: {condition.status} - {condition.message || 'No message'}
            </ListItem>
          ))}
        </List>
      </PanelMain>
    </Panel>
  );

  debugRenderLogs();

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
        title="Initializing Pipeline Server"
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
