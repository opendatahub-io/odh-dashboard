import * as React from 'react';
import { DropEvent } from '@patternfly/react-core';
import { ChatbotFootnote, MessageBar } from '@patternfly/chatbot';
import { FileRejection } from 'react-dropzone';
import { FILE_UPLOAD_CONFIG, ERROR_MESSAGES } from '~/app/Chatbot/const';

interface ChatbotMessageInputProps {
  /** Callback when a message is sent */
  onSendMessage: (message: string) => void;
  /** Callback when stop button is clicked */
  onStopStreaming: () => void;
  /** Whether any instance is currently loading */
  isLoading: boolean;
  /** Whether the send button should be disabled */
  isSendDisabled: boolean;
  /** Whether to show the attach button (hidden in compare mode) */
  showAttachButton?: boolean;
  /** Callback for file attachment */
  onAttach?: <T extends File>(
    acceptedFiles: T[],
    fileRejections: FileRejection[],
    event: DropEvent,
  ) => void;
  /** Callback for showing error alerts */
  onShowErrorAlert?: (message: string, title: string) => void;
  /** Whether dark mode is enabled */
  isDarkMode?: boolean;
}

/**
 * Shared message input component for the chatbot.
 * Used in both single and compare modes.
 */
const ChatbotMessageInput: React.FC<ChatbotMessageInputProps> = ({
  onSendMessage,
  onStopStreaming,
  isLoading,
  isSendDisabled,
  showAttachButton = true,
  onAttach,
  onShowErrorAlert,
  isDarkMode,
}) => {
  const handleAttachRejected = React.useCallback(
    (fileRejections: FileRejection[]) => {
      const errorMessages = fileRejections
        .map((rejection) => {
          const fileErrors = rejection.errors.map((error) => {
            switch (error.code) {
              case 'file-too-large':
                return ERROR_MESSAGES.FILE_TOO_LARGE;
              case 'too-many-files':
                return ERROR_MESSAGES.TOO_MANY_FILES;
              case 'file-invalid-type':
                return `File type not supported. Accepted types: ${FILE_UPLOAD_CONFIG.ACCEPTED_EXTENSIONS}`;
              default:
                return error.message;
            }
          });
          return `${rejection.file.name}: ${fileErrors.join(', ')}`;
        })
        .join('; ');

      onShowErrorAlert?.(
        `${ERROR_MESSAGES.FILE_UPLOAD_REJECTED}: ${errorMessages}`,
        'File Upload Error',
      );
    },
    [onShowErrorAlert],
  );

  return (
    <div
      style={{
        flexShrink: 0,
        padding: '1rem',
        backgroundColor: isDarkMode
          ? 'var(--pf-t--global--dark--background--color--100)'
          : 'var(--pf-t--global--background--color--100)',
      }}
    >
      <div
        style={{
          border: isDarkMode ? 'none' : '1px solid var(--pf-t--global--border--color--default)',
          borderRadius: '2.25rem',
        }}
      >
        <MessageBar
          onSendMessage={(message) => {
            if (typeof message === 'string') {
              onSendMessage(message);
            }
          }}
          handleStopButton={onStopStreaming}
          hasAttachButton={showAttachButton}
          isSendButtonDisabled={isSendDisabled}
          hasStopButton={isLoading}
          data-testid="chatbot-message-bar"
          onAttach={onAttach}
          onAttachRejected={handleAttachRejected}
          allowedFileTypes={FILE_UPLOAD_CONFIG.ALLOWED_FILE_TYPES}
          maxSize={FILE_UPLOAD_CONFIG.MAX_FILE_SIZE}
          maxFiles={FILE_UPLOAD_CONFIG.MAX_FILES_IN_VECTOR_STORE}
          buttonProps={{
            attach: {
              tooltipContent: `Upload files (${FILE_UPLOAD_CONFIG.ACCEPTED_EXTENSIONS}, max ${FILE_UPLOAD_CONFIG.MAX_FILE_SIZE / (1024 * 1024)}MB)`,
              inputTestId: 'chatbot-attach-input',
            },
            send: {
              // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
              props: {
                'data-testid': 'chatbot-send-button',
              } as React.ComponentProps<'button'>,
            },
          }}
        />
      </div>
      <ChatbotFootnote label="This chatbot uses AI. Check for mistakes." />
    </div>
  );
};

export default ChatbotMessageInput;
