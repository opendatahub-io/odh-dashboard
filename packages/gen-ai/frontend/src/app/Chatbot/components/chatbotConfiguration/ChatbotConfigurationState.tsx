import React from 'react';
import { Icon, Stack, StackItem, Content, Title, Spinner } from '@patternfly/react-core';
import { CheckCircleIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import { GenAiContext } from '~/app/context/GenAiContext';
import useFetchLSDStatus from '~/app/hooks/useFetchLSDStatus';
import { genAiChatPlaygroundRoute } from '~/app/utilities/routes';

type ChatbotConfigurationStateProps = {
  redirectToPlayground?: boolean;
};

const ChatbotConfigurationState: React.FC<ChatbotConfigurationStateProps> = ({
  redirectToPlayground,
}) => {
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
  return (
    <Stack hasGutter style={{ textAlign: 'center' }}>
      <StackItem>{icon}</StackItem>
      <StackItem>
        <Title headingLevel="h4">{title}</Title>
      </StackItem>
      <StackItem>
        <Content component="small">{description}</Content>
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
