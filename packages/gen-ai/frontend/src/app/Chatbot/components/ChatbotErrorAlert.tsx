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
  const { variant, title, description, details, isRetriable } = classifiedError;

  const handleCopy = async () => {
    const rawError = details.errorCode
      ? `[${details.errorCode}] ${details.rawMessage}`
      : details.rawMessage;
    try {
      await navigator.clipboard.writeText(rawError);
    } catch {
      // Silently fail - clipboard functionality is non-critical
      // navigator.clipboard.writeText is supported in all target browsers
    }
  };

  // Action link for retry (single ReactNode, not array - matches prototype)
  const actionLinks = React.useMemo(() => {
    if (isRetriable && onRetry) {
      return (
        <AlertActionLink onClick={onRetry} data-testid={`${dataTestId}-retry-link`}>
          {retryCount > 0 ? 'Retry again' : 'Retry'}
        </AlertActionLink>
      );
    }

    return undefined;
  }, [isRetriable, onRetry, retryCount, dataTestId]);

  const rawErrorText = details.errorCode
    ? `[${details.errorCode}] ${details.rawMessage}`
    : details.rawMessage;

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
      <div>
        <CodeBlock
          actions={
            <CodeBlockAction>
              <ClipboardCopyButton
                id={`copy-error-${details.errorCode}`}
                textId="error-code"
                aria-label="Copy error to clipboard"
                onClick={handleCopy}
                exitDelay={2000}
                variant="plain"
              >
                Copy
              </ClipboardCopyButton>
            </CodeBlockAction>
          }
        >
          <CodeBlockCode>{rawErrorText}</CodeBlockCode>
        </CodeBlock>
      </div>
    </Alert>
  );
};

export default ChatbotErrorAlert;
