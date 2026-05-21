import React from 'react';
import { Button, Tooltip } from '@patternfly/react-core';
import { ExternalLinkAltIcon } from '@patternfly/react-icons';
import { Message } from '@patternfly/chatbot';
import {
  MLFLOW_PROXY_BASE_PATH,
  WORKSPACE_QUERY_PARAM,
} from '@odh-dashboard/internal/routes/pipelines/mlflow';
import botAvatar from '~/app/bgimages/bot_avatar.svg';
import { ChatbotMessageProps } from '~/app/Chatbot/hooks/useChatbotMessages';
import { ChatbotMessagesMetrics } from '~/app/Chatbot/ChatbotMessagesMetrics';

type ChatbotMessagesListProps = {
  messageList: ChatbotMessageProps[];
  scrollRef: React.RefObject<HTMLDivElement>;
  isLoading: boolean;
  isStreamingWithoutContent: boolean;
  /** Display name of the selected model (shown in loading state and message headers) */
  modelDisplayName?: string;
  /** Shown as a bot message when the conversation is empty and not loading */
  placeholderContent?: string;
  namespace?: string;
};

const ChatbotMessagesList: React.FC<ChatbotMessagesListProps> = ({
  messageList,
  scrollRef,
  isLoading = false,
  isStreamingWithoutContent = false,
  modelDisplayName = 'Bot',
  placeholderContent,
  namespace,
}) => {
  // Show loading dots only for non-streaming requests
  // During streaming, loading dots are handled within the bot message itself
  const showLoadingDots = isLoading && !isStreamingWithoutContent;

  return (
    <>
      {messageList.length === 0 && !isLoading && placeholderContent && (
        <Message
          // eslint-disable-next-line jsx-a11y/aria-role
          role="bot"
          name={modelDisplayName}
          avatar={botAvatar}
          content={placeholderContent}
          data-testid="chatbot-placeholder-message"
          style={{ cursor: 'default', pointerEvents: 'none' }}
        />
      )}
      {messageList.map((message, index) => {
        // Destructure custom fields to avoid passing them to PatternFly Message component
        const { metrics, traceId, ...messageProps } = message;

        // Build extraContent with metrics if present (for bot messages)
        const extraContent =
          message.role === 'bot' && metrics
            ? { endContent: <ChatbotMessagesMetrics metrics={metrics} /> }
            : undefined;

        // TODO: Replace hardcoded cluster URL and experiment ID with dynamic values from BFF config or env vars
        const traceAction =
          message.role === 'bot' && traceId && namespace ? (
            <Tooltip content="View trace details in MLflow">
              <Button
                variant="link"
                aria-label="View trace"
                data-testid="view-trace-button"
                component="a"
                href={`https://rh-ai.apps.rhoai-autorag-pool-gzkqj.aws.rh-ods.com${MLFLOW_PROXY_BASE_PATH}/#/experiments/6/traces?${WORKSPACE_QUERY_PARAM}=${encodeURIComponent(namespace)}&selectedEvaluationId=tr-${traceId}`}
                target="_blank"
                rel="noopener noreferrer"
                size="sm"
                icon={<ExternalLinkAltIcon />}
                iconPosition="end"
              >
                View trace
              </Button>
            </Tooltip>
          ) : undefined;

        const actionsContent = traceAction
          ? {
              endContent: (
                <>
                  {extraContent?.endContent}
                  {traceAction}
                </>
              ),
            }
          : extraContent;

        return (
          <React.Fragment key={message.id}>
            <Message
              {...messageProps}
              extraContent={actionsContent}
              data-testid={`chatbot-message-${message.role}`}
            />
            {index === messageList.length - 1 && <div ref={scrollRef} />}
          </React.Fragment>
        );
      })}
      {showLoadingDots && (
        <Message
          name={modelDisplayName}
          // eslint-disable-next-line jsx-a11y/aria-role
          role="bot"
          avatar={botAvatar}
          isLoading
          data-testid="chatbot-message-bot"
        />
      )}
    </>
  );
};

const ChatbotMessages = React.memo(ChatbotMessagesList);

export { ChatbotMessages };
