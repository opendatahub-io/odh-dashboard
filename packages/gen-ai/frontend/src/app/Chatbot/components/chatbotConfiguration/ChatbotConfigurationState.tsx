import React from 'react';
import { Icon, Stack, StackItem, Title, Spinner } from '@patternfly/react-core';
import { CheckCircleIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import { Link, useNavigate } from 'react-router-dom';
import { GenAiContext } from '~/app/context/GenAiContext';
import useFetchLSDStatus from '~/app/hooks/useFetchLSDStatus';
import { genAiChatPlaygroundRoute } from '~/app/utilities/routes';

type ChatbotConfigurationStateProps = {
  redirectToPlayground?: boolean;
  onClose?: () => void;
};

const ChatbotConfigurationState: React.FC<ChatbotConfigurationStateProps> = ({
  redirectToPlayground,
  onClose,
}) => {
  const { namespace } = React.useContext(GenAiContext);
  const navigate = useNavigate();
  const [activelyRefreshing, setActivelyRefreshing] = React.useState(true);
  const { data: lsdStatus } = useFetchLSDStatus(namespace?.name, activelyRefreshing);

  React.useEffect(() => {
    if (lsdStatus?.phase && lsdStatus.phase !== 'Initializing') {
      setActivelyRefreshing(false);
    }
  }, [lsdStatus]);

  // Auto-close modal after 5 seconds when playground is successfully created
  React.useEffect(() => {
    if (lsdStatus?.phase === 'Ready') {
      const timer = setTimeout(() => {
        if (redirectToPlayground) {
          // Navigate to playground if opened from AI assets tab
          navigate(genAiChatPlaygroundRoute(namespace?.name));
        } else if (onClose) {
          // Just close the modal if opened from playground
          onClose();
        }
      }, 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [lsdStatus?.phase, redirectToPlayground, navigate, namespace?.name, onClose]);

  let icon: React.ReactNode;
  let title: string;

  switch (lsdStatus?.phase) {
    case 'Ready':
      icon = (
        <Icon iconSize="2xl" size="2xl" status="success">
          <CheckCircleIcon />
        </Icon>
      );
      title = 'Playground created';
      break;
    case 'Failed':
      icon = (
        <Icon iconSize="2xl" size="2xl" status="danger">
          <ExclamationCircleIcon />
        </Icon>
      );
      title = 'Playground creation failed';
      break;
    default:
      icon = <Spinner size="xl" />;
      title = 'Creating playground';
  }
  return (
    <Stack hasGutter style={{ textAlign: 'center' }}>
      <StackItem>{icon}</StackItem>
      <StackItem>
        <Title headingLevel="h4">{title}</Title>
      </StackItem>
      {redirectToPlayground && lsdStatus?.phase === 'Ready' && (
        <StackItem>
          <Link to={genAiChatPlaygroundRoute(namespace?.name)}>Go to playground</Link>
        </StackItem>
      )}
    </Stack>
  );
};

export default ChatbotConfigurationState;
