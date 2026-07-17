import React from 'react';
import { Button, Stack, StackItem } from '@patternfly/react-core';
import { Message, MessageProps as PFMessageProps } from '@patternfly/chatbot';
import botAvatar from '~/app/bgimages/bot_avatar.svg';
import { ChatbotMessageProps } from '~/app/Chatbot/hooks/useChatbotMessages';
import { ChatbotMessagesMetrics } from '~/app/Chatbot/ChatbotMessagesMetrics';
import ChatbotErrorAlert from '~/app/Chatbot/components/ChatbotErrorAlert';
import ChatbotFileSearchResults from '~/app/Chatbot/ChatbotFileSearchResults';
import './ChatbotMessagesList.scss';

type ChatbotMessagesListProps = {
  messageList: ChatbotMessageProps[];
  scrollRef: React.RefObject<HTMLDivElement>;
  isLoading: boolean;
  /** Display name of the selected model (shown in loading state and message headers) */
  modelDisplayName?: string;
  /** Shown as a bot message when the conversation is empty and not loading */
  placeholderContent?: string;
  /** Whether the conversation contains images in user messages (disables image stripping) */
  hasImagesInConversation?: boolean;
  /** Called when the user clicks "View trace" on a bot message with a traceId */
  onViewTrace?: (traceId: string) => void;
};

const CITATION_REGEX = /\{\{citation:(\d+)\}\}/g;
const CITE_HREF_PREFIX = '#cite-';

const prepareCitationContent = (content: string): string =>
  content.replace(CITATION_REGEX, (_, num) => `[\\[${num}\\]](${CITE_HREF_PREFIX}${num})`);

const ChatbotMessagesList: React.FC<ChatbotMessagesListProps> = ({
  messageList,
  scrollRef,
  isLoading = false,
  modelDisplayName = 'Bot',
  placeholderContent,
  hasImagesInConversation = false,
  onViewTrace,
}) => {
  const [expandedCitation, setExpandedCitation] = React.useState<{
    messageId: string;
    citationNumber: number;
  } | null>(null);

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
        // Destructure metrics and extraContent from message to avoid passing raw to PatternFly
        const {
          metrics,
          extraContent: messageExtraContent,
          errorClassification,
          onRetryError,
          fileSearchData,
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          annotations,
          citationMap,
          ...messageProps
        } = message;

        // Build extraContent with metrics and error alerts
        const extraContent: PFMessageProps['extraContent'] = { ...messageExtraContent };

        // Full-failure errors: render as beforeMainContent (above empty content)
        if (
          message.role === 'bot' &&
          errorClassification &&
          errorClassification.pattern === 'full-failure'
        ) {
          extraContent.beforeMainContent = (
            <ChatbotErrorAlert
              classifiedError={errorClassification}
              onRetry={onRetryError}
              data-testid={`chatbot-error-alert-${message.id}`}
            />
          );
        }

        // Add file search results, metrics, and trace link to endContent (if present and no error)
        const traceId = metrics?.trace_id || errorClassification?.traceId;
        if (message.role === 'bot' && (fileSearchData || metrics || traceId)) {
          extraContent.endContent = (
            <Stack hasGutter>
              {!errorClassification && fileSearchData && (
                <StackItem>
                  <ChatbotFileSearchResults
                    fileSearchData={fileSearchData}
                    citationMap={citationMap}
                    expandedCitation={
                      expandedCitation !== null && expandedCitation.messageId === message.id
                        ? expandedCitation.citationNumber
                        : undefined
                    }
                    onCitationExpanded={() => setExpandedCitation(null)}
                  />
                </StackItem>
              )}
              {!errorClassification && metrics && (
                <StackItem>
                  <ChatbotMessagesMetrics metrics={metrics} />
                </StackItem>
              )}
              {traceId && onViewTrace && (
                <StackItem>
                  <Button
                    variant="link"
                    isInline
                    onClick={() => onViewTrace(traceId)}
                    data-testid="view-trace-link"
                  >
                    View trace
                  </Button>
                </StackItem>
              )}
            </Stack>
          );
        }

        // Partial-failure errors: render as beforeMainContent (warning alert above response)
        // Note: Full-failure errors are already handled above in the same way
        if (
          message.role === 'bot' &&
          errorClassification &&
          errorClassification.pattern === 'partial-failure'
        ) {
          extraContent.beforeMainContent = (
            <ChatbotErrorAlert
              classifiedError={errorClassification}
              onRetry={onRetryError}
              data-testid={`chatbot-error-alert-${message.id}`}
            />
          );
        }

        // Add streaming interruption alert to afterMainContent (danger alert below partial response)
        if (
          message.role === 'bot' &&
          errorClassification &&
          errorClassification.pattern === 'streaming-interruption'
        ) {
          extraContent.afterMainContent = (
            <ChatbotErrorAlert
              classifiedError={errorClassification}
              onRetry={onRetryError}
              data-testid={`chatbot-error-alert-${message.id}`}
            />
          );
        }

        const hasCitations =
          message.role === 'bot' &&
          citationMap &&
          citationMap.size > 0 &&
          typeof message.content === 'string';

        // For messages with citations, replace markers with markdown links and
        // intercept them via reactMarkdownProps to render as clickable buttons
        const citationProps = hasCitations
          ? {
              content: prepareCitationContent(String(message.content)),
              reactMarkdownProps: {
                components: {
                  a: ({
                    href,
                    children: linkChildren,
                    ...rest
                  }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
                    if (href?.startsWith(CITE_HREF_PREFIX)) {
                      const num = parseInt(href.slice(CITE_HREF_PREFIX.length), 10);
                      return (
                        <button
                          type="button"
                          className="chatbot-citation-inline"
                          onClick={() =>
                            setExpandedCitation({
                              messageId: message.id ?? '',
                              citationNumber: num,
                            })
                          }
                          aria-label={`Citation ${String(num)}`}
                          data-testid={`citation-inline-${String(num)}`}
                        >
                          {linkChildren}
                        </button>
                      );
                    }
                    return (
                      <a href={href} {...rest}>
                        {linkChildren}
                      </a>
                    );
                  },
                },
              },
            }
          : undefined;

        return (
          <React.Fragment key={message.id}>
            <Message
              {...messageProps}
              {...citationProps}
              extraContent={Object.keys(extraContent).length > 0 ? extraContent : undefined}
              data-testid={`chatbot-message-${message.role}`}
              {...(hasImagesInConversation && { hasNoImagesInUserMessages: false })}
            />
            {index === messageList.length - 1 && <div ref={scrollRef} />}
          </React.Fragment>
        );
      })}
    </>
  );
};

const ChatbotMessages = React.memo(ChatbotMessagesList);

export { ChatbotMessages };
