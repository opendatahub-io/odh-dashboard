import React from 'react';
import {
  Modal,
  ModalBody,
  Stack,
  StackItem,
  Spinner,
  Title,
  Content,
  Icon,
} from '@patternfly/react-core';
import { CheckCircleIcon } from '@patternfly/react-icons';
import useFetchLSDStatus from '~/app/hooks/useFetchLSDStatus';
import { GenAiContext } from '~/app/context/GenAiContext';

type ChatbotConfigurationModalProps = {
  onClose: () => void;
};

const ChatbotConfigurationModal: React.FC<ChatbotConfigurationModalProps> = ({ onClose }) => {
  const { namespace } = React.useContext(GenAiContext);
  const [isRunning, setIsRunning] = React.useState(true);
  const { data: lsdStatus } = useFetchLSDStatus(namespace?.name, !isRunning);

  React.useEffect(() => {
    setIsRunning(lsdStatus?.phase === 'Running');
  }, [lsdStatus]);

  return (
    <Modal isOpen onClose={onClose} variant="medium" style={{ textAlign: 'center' }}>
      <ModalBody>
        <Stack hasGutter>
          {isRunning ? (
            <>
              <StackItem>
                <Icon iconSize="2xl" size="2xl" status="success">
                  <CheckCircleIcon />
                </Icon>
              </StackItem>
              <StackItem>
                <Title headingLevel="h2">Playground configured</Title>
              </StackItem>
              <StackItem>
                <Content component="small">Your playground has been successfully created</Content>
              </StackItem>
            </>
          ) : (
            <>
              <StackItem>
                <Spinner size="xl" />
              </StackItem>
              <StackItem>
                <Title headingLevel="h2">Configuring playground</Title>
              </StackItem>
              <StackItem>
                <Content component="small">
                  Please wait while we add models and configure the playground
                </Content>
              </StackItem>
            </>
          )}
        </Stack>
      </ModalBody>
    </Modal>
  );
};

export default ChatbotConfigurationModal;
