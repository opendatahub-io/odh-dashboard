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
import { CheckCircleIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import useFetchLSDStatus from '~/app/hooks/useFetchLSDStatus';
import { GenAiContext } from '~/app/context/GenAiContext';

type ChatbotConfigurationModalProps = {
  onClose: () => void;
};

const ChatbotConfigurationModal: React.FC<ChatbotConfigurationModalProps> = ({ onClose }) => {
  const { namespace } = React.useContext(GenAiContext);
  const [activelyRefreshing, setActivelyRefreshing] = React.useState(true);
  const { data: lsdStatus } = useFetchLSDStatus(namespace?.name, activelyRefreshing);

  React.useEffect(() => {
    if (lsdStatus?.phase && lsdStatus.phase !== 'Initializing') {
      setActivelyRefreshing(false);
    }
  }, [lsdStatus]);

  let icon: React.ReactNode;
  let title: string;
  let description: string;

  switch (lsdStatus?.phase) {
    case 'Ready':
      icon = (
        <Icon iconSize="2xl" size="2xl" status="success">
          <CheckCircleIcon />
        </Icon>
      );
      title = 'Playground configured';
      description = 'Your playground has been successfully created';
      break;
    case 'Failed':
      icon = (
        <Icon iconSize="2xl" size="2xl" status="danger">
          <ExclamationCircleIcon />
        </Icon>
      );
      title = 'Failed to configure playground';
      description = 'Please try again';
      break;
    default:
      icon = <Spinner size="xl" />;
      title = 'Configuring playground';
      description = 'Please wait while we add models and configure the playground';
  }

  // TODO: Add Failed status
  return (
    <Modal isOpen onClose={onClose} variant="medium" style={{ textAlign: 'center' }}>
      <ModalBody>
        <Stack hasGutter>
          <StackItem>{icon}</StackItem>
          <StackItem>
            <Title headingLevel="h2">{title}</Title>
          </StackItem>
          <StackItem>
            <Content component="small">{description}</Content>
          </StackItem>
        </Stack>
      </ModalBody>
    </Modal>
  );
};

export default ChatbotConfigurationModal;
