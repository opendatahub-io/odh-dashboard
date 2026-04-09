import * as React from 'react';
import {
  Alert,
  AlertActionLink,
  CodeBlock,
  CodeBlockCode,
  CodeBlockAction,
} from '@patternfly/react-core';
import { ClipboardCopyButton } from '@patternfly/react-core';
import { ErrorClassification } from '~/app/types';

type ChatbotErrorAlertProps = {
  /** Error classification with UI rendering details */
  errorClassification: ErrorClassification;
  /** Callback when retry is clicked (only shown if retriable) */
  onRetry?: () => void;
  /** Test ID for the alert */
  'data-testid'?: string;
};

/**
 * Interpolates template variables into a string
 * Replaces {variableName} with values from templateVars
 */
const interpolateTemplate = (
  template: string,
  templateVars?: Record<string, string | number>,
): string => {
  if (!templateVars) {
    return template;
  }

  let result = template;
  Object.entries(templateVars).forEach(([key, value]) => {
    const placeholder = `{${key}}`;
    result = result.replace(new RegExp(placeholder, 'g'), String(value));
  });

  return result;
};

/**
 * ChatbotErrorAlert - Expandable inline alert for chatbot errors
 *
 * Displays error information in three layers:
 * 1. Collapsed state: Icon + Title + Retry link (if retriable)
 * 2. Expanded state: Description text explaining impact
 * 3. Code block: Raw error code and message for debugging
 *
 * Follows PatternFly expandable inline alert pattern with proper spacing:
 * - Right padding matches left visual indentation
 * - Spacer between description and code block
 */
const ChatbotErrorAlert: React.FC<ChatbotErrorAlertProps> = ({
  errorClassification,
  onRetry,
  'data-testid': dataTestId = 'chatbot-error-alert',
}) => {
  const { severity, retriable, title, description, rawError, templateVars } = errorClassification;

  // Interpolate template variables in title and description
  const interpolatedTitle = interpolateTemplate(title, templateVars);
  const interpolatedDescription = interpolateTemplate(description, templateVars);

  // Build code block content: [ERROR_CODE] message
  const codeBlockContent = rawError.code
    ? `[${rawError.code}] ${rawError.message}`
    : rawError.message;

  // Action link for retry (only if retriable and onRetry callback provided)
  const actionLinks = React.useMemo(() => {
    if (retriable && onRetry) {
      return (
        <AlertActionLink onClick={onRetry} data-testid={`${dataTestId}-retry-link`}>
          Retry
        </AlertActionLink>
      );
    }
    return undefined;
  }, [retriable, onRetry, dataTestId]);

  return (
    <Alert
      variant={severity}
      title={interpolatedTitle}
      isInline
      isExpandable
      actionLinks={actionLinks}
      data-testid={dataTestId}
    >
      {/* Description text explaining what happened and impact */}
      <div style={{ marginBottom: 'var(--pf-t--global--spacer--md)' }}>
        {interpolatedDescription}
      </div>

      {/* Code block with raw error for debugging */}
      <CodeBlock
        actions={
          <CodeBlockAction>
            <ClipboardCopyButton
              id={`${dataTestId}-copy-button`}
              textId={`${dataTestId}-code-content`}
              aria-label="Copy error to clipboard"
              onClick={() => navigator.clipboard.writeText(codeBlockContent)}
              exitDelay={600}
              maxWidth="110px"
              variant="plain"
            >
              Copy
            </ClipboardCopyButton>
          </CodeBlockAction>
        }
      >
        <CodeBlockCode id={`${dataTestId}-code-content`}>{codeBlockContent}</CodeBlockCode>
      </CodeBlock>
    </Alert>
  );
};

export default ChatbotErrorAlert;
