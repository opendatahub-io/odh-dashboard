import React from 'react';
import { Icon, Stack, StackItem, Title, Spinner } from '@patternfly/react-core';
import { CheckCircleIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import { Link, useNavigate } from 'react-router-dom';
import { GenAiContext } from '~/app/context/GenAiContext';
import useFetchLSDStatus from '~/app/hooks/useFetchLSDStatus';
import useFetchNemoGuardrailsStatus from '~/app/hooks/useFetchNemoGuardrailsStatus';
import useGuardrailsEnabled from '~/app/Chatbot/hooks/useGuardrailsEnabled';
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
  const guardrailsEnabled = useGuardrailsEnabled();

  const [lsdRefreshing, setLsdRefreshing] = React.useState(true);
  const [nemoRefreshing, setNemoRefreshing] = React.useState(true);

  const { data: lsdStatus } = useFetchLSDStatus(lsdRefreshing);
  const { data: nemoStatus } = useFetchNemoGuardrailsStatus(
    guardrailsEnabled && nemoRefreshing,
    guardrailsEnabled,
  );

  const lsdReady = lsdStatus?.phase === 'Ready';
  const lsdFailed = lsdStatus?.phase === 'Failed';
  // NemoGuardrails is considered done when it has left the progressing state
  // (either Ready or any other terminal phase). A non-Ready terminal phase is
  // treated as "done enough" for now — proper failure handling is a follow-up.
  // Don't want it to be blocking
  const nemoTerminal = nemoStatus !== null && nemoStatus.phase !== 'Progressing';
  const nemoReady = !guardrailsEnabled || nemoStatus?.isReady === true || nemoTerminal;
  const playgroundReady = lsdReady && nemoReady;

  React.useEffect(() => {
    if (lsdStatus?.phase && lsdStatus.phase !== 'Initializing') {
      setLsdRefreshing(false);
    }
  }, [lsdStatus?.phase]);

  React.useEffect(() => {
    if (nemoReady) {
      setNemoRefreshing(false);
    }
  }, [nemoReady]);

  // Auto-close modal after 5 seconds when playground is fully ready
  React.useEffect(() => {
    if (playgroundReady) {
      const timer = setTimeout(() => {
        if (redirectToPlayground) {
          navigate(genAiChatPlaygroundRoute(namespace?.name));
        } else if (onClose) {
          onClose();
        }
      }, 5000);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [playgroundReady, redirectToPlayground, navigate, namespace?.name, onClose]);

  let icon: React.ReactNode;
  let title: string;

  if (lsdFailed) {
    icon = (
      <Icon iconSize="2xl" size="2xl" status="danger">
        <ExclamationCircleIcon />
      </Icon>
    );
    title = 'Playground creation failed';
  } else if (playgroundReady) {
    icon = (
      <Icon iconSize="2xl" size="2xl" status="success">
        <CheckCircleIcon />
      </Icon>
    );
    title = 'Playground created';
  } else {
    icon = <Spinner size="xl" />;
    title = 'Creating playground';
  }

  return (
    <Stack hasGutter style={{ textAlign: 'center' }}>
      <StackItem>{icon}</StackItem>
      <StackItem>
        <Title headingLevel="h4">{title}</Title>
      </StackItem>
      {redirectToPlayground && playgroundReady && (
        <StackItem>
          <Link to={genAiChatPlaygroundRoute(namespace?.name)} data-testid="go-to-playground-link">
            Go to playground
          </Link>
        </StackItem>
      )}
    </Stack>
  );
};

export default ChatbotConfigurationState;
