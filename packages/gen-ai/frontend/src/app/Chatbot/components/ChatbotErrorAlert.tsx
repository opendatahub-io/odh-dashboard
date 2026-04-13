import * as React from 'react';
import {
  Alert,
  AlertActionLink,
  CodeBlock,
  CodeBlockCode,
  CodeBlockAction,
  ClipboardCopyButton,
} from '@patternfly/react-core';
import { ClassifiedError } from '~/app/types';

type ChatbotErrorAlertProps = {
  /** Classified error with UI rendering details */
  classifiedError: ClassifiedError;
  /** Callback when retry is clicked (only shown if retriable) */
  onRetry?: () => void;
  /** Retry count for button label */
  retryCount?: number;
  /** Test ID for the alert */
  'data-testid'?: string;
};

/**
 * ChatbotErrorAlert - Expandable inline alert for chatbot errors
 *
 * Matches UXD prototype structure exactly:
 * - Collapsed state: Icon + Title + Retry link (if retriable)
 * - Expanded state: Description text explaining impact
 * - Code block: Raw error code and message for debugging
 */
const ChatbotErrorAlert: React.FC<ChatbotErrorAlertProps> = ({
  classifiedError,
  onRetry,
  retryCount = 0,
  'data-testid': dataTestId = 'chatbot-error-alert',
}) => {
  const { variant, title, description, details, isRetriable, actionSuggestion } = classifiedError;
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    const rawError = `[${details.errorCode}] ${details.rawMessage}`;
    navigator.clipboard.writeText(rawError);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Action links for retry and action suggestions
  const actionLinks = React.useMemo(() => {
    const links: React.ReactNode[] = [];

    if (isRetriable && onRetry) {
      links.push(
        <AlertActionLink key="retry" onClick={onRetry} data-testid={`${dataTestId}-retry-link`}>
          {retryCount > 0 ? 'Retry again' : 'Retry'}
        </AlertActionLink>,
      );
    }

    // Action suggestions (e.g., "Open Build panel") - for future implementation
    if (actionSuggestion) {
      // TODO: Implement action suggestion handlers
      // links.push(<AlertActionLink key="action">{actionSuggestion}</AlertActionLink>);
    }

    return links.length > 0 ? links : undefined;
  }, [isRetriable, onRetry, retryCount, actionSuggestion, dataTestId]);

  const rawErrorText = `[${details.errorCode}] ${details.rawMessage}`;

  return (
    <Alert
      variant={variant}
      title={title}
      isInline
      isExpandable
      actionLinks={actionLinks}
      data-testid={dataTestId}
    >
      {/* Description explaining what happened and impact */}
      <p>{description}</p>

      {/* Code block with error details */}
      <CodeBlock
        actions={
          <CodeBlockAction>
            <ClipboardCopyButton
              id={`copy-error-${details.errorCode}`}
              textId="error-code"
              aria-label="Copy error to clipboard"
              onClick={handleCopy}
              variant="plain"
            >
              {copied ? 'Copied' : 'Copy'}
            </ClipboardCopyButton>
          </CodeBlockAction>
        }
      >
        <CodeBlockCode>{rawErrorText}</CodeBlockCode>
      </CodeBlock>
    </Alert>
  );
};

export default ChatbotErrorAlert;
