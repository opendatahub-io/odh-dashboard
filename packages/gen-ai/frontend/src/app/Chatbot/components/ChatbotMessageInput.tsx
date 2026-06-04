import * as React from 'react';
import {
  Alert,
  AlertActionCloseButton,
  DropEvent,
  MenuItem,
  MenuList,
} from '@patternfly/react-core';
import { ChatbotFootnote, FileDetailsLabel, MessageBar } from '@patternfly/chatbot';
import { FileRejection } from 'react-dropzone';
import { OutlinedFileImageIcon, VolumeUpIcon, OutlinedFileAltIcon } from '@patternfly/react-icons';
import {
  VISION_UPLOAD_CONFIG,
  FILE_UPLOAD_CONFIG,
  ERROR_MESSAGES,
  ALERT_TIMEOUT_MS,
} from '~/app/Chatbot/const';

export interface ImageUploadState {
  uploading: boolean;
  progress: number;
  fileId: string | null;
  previewUrl: string | null;
  fileName: string | null;
}

export interface PendingDocChip {
  id: string;
  fileName: string;
  status: 'uploading' | 'uploaded' | 'failed';
}

interface ChatbotMessageInputProps {
  onSendMessage: (message: string) => void;
  onStopStreaming: () => void;
  isLoading: boolean;
  isSendDisabled: boolean;
  showAttachButton?: boolean;
  onDocumentAttach?: <T extends File>(
    acceptedFiles: T[],
    fileRejections: FileRejection[],
    event: DropEvent,
  ) => void;
  isDarkMode?: boolean;
  onImageUpload: (file: File) => void;
  imageUploadState: ImageUploadState;
  onRemoveImage: () => void;
  isImageUploadDisabled: boolean;
  isAudioUploadDisabled: boolean;
  pendingDocChips?: PendingDocChip[];
  onRemoveDocChip?: (chipId: string) => void;
  alwaysShowSendButton?: boolean;
}

const ChatbotMessageInput: React.FC<ChatbotMessageInputProps> = ({
  onSendMessage,
  onStopStreaming,
  isLoading,
  isSendDisabled,
  showAttachButton = true,
  onDocumentAttach,
  isDarkMode,
  onImageUpload,
  imageUploadState,
  onRemoveImage,
  isImageUploadDisabled,
  isAudioUploadDisabled,
  pendingDocChips,
  onRemoveDocChip,
  alwaysShowSendButton,
}) => {
  const [isAttachMenuOpen, setIsAttachMenuOpen] = React.useState(false);
  const [validationError, setValidationError] = React.useState<string | null>(null);
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const documentInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!validationError) {
      return undefined;
    }
    const timer = setTimeout(() => setValidationError(null), ALERT_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, [validationError]);

  const handleMenuSelect = React.useCallback((action: string) => {
    setIsAttachMenuOpen(false);
    if (action === 'upload-image') {
      imageInputRef.current?.click();
    } else if (action === 'upload-documents') {
      documentInputRef.current?.click();
    }
  }, []);

  const handleImageFileSelect = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }
      // Reset the input so re-selecting the same file triggers onChange
      // eslint-disable-next-line no-param-reassign
      event.target.value = '';

      if (!VISION_UPLOAD_CONFIG.ALLOWED_MIME_TYPES.includes(file.type)) {
        setValidationError(`${file.name} is not a supported file type. Accepted types: JPG, PNG.`);
        return;
      }
      if (file.size > VISION_UPLOAD_CONFIG.MAX_FILE_SIZE) {
        setValidationError(
          `${file.name} exceeds maximum size of ${VISION_UPLOAD_CONFIG.MAX_FILE_SIZE / (1024 * 1024)} MB. Try a smaller file.`,
        );
        return;
      }
      onImageUpload(file);
    },
    [onImageUpload],
  );

  const handleDocumentFileSelect = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(event.target.files || []);
      if (!files.length) {
        return;
      }
      // eslint-disable-next-line no-param-reassign
      event.target.value = '';

      const allowedMimes = Object.keys(FILE_UPLOAD_CONFIG.ALLOWED_FILE_TYPES);
      const errors: string[] = [];
      const accepted: File[] = [];

      for (const file of files) {
        if (file.size > FILE_UPLOAD_CONFIG.MAX_FILE_SIZE) {
          errors.push(`${file.name}: ${ERROR_MESSAGES.FILE_TOO_LARGE}`);
        } else if (!allowedMimes.includes(file.type)) {
          errors.push(
            `${file.name}: File type not supported. Accepted types: ${FILE_UPLOAD_CONFIG.ACCEPTED_EXTENSIONS}`,
          );
        } else {
          accepted.push(file);
        }
      }

      if (errors.length) {
        setValidationError(`${ERROR_MESSAGES.FILE_UPLOAD_REJECTED}: ${errors.join('; ')}`);
      }
      if (accepted.length && onDocumentAttach) {
        onDocumentAttach(accepted, [], new Event('change'));
      }
    },
    [onDocumentAttach],
  );

  const attachMenuItems = React.useMemo(
    () => (
      <MenuList>
        <MenuItem
          icon={<OutlinedFileImageIcon />}
          isDisabled={isImageUploadDisabled}
          onClick={() => handleMenuSelect('upload-image')}
        >
          Upload image
        </MenuItem>
        <MenuItem icon={<VolumeUpIcon />} isDisabled={isAudioUploadDisabled}>
          Upload audio
        </MenuItem>
        <MenuItem
          icon={<OutlinedFileAltIcon />}
          onClick={() => handleMenuSelect('upload-documents')}
        >
          Upload documents
        </MenuItem>
      </MenuList>
    ),
    [isImageUploadDisabled, isAudioUploadDisabled, handleMenuSelect],
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
      {validationError && (
        <div style={{ paddingBottom: '0.5rem' }}>
          <Alert
            variant="danger"
            isInline
            title={validationError}
            actionClose={<AlertActionCloseButton onClose={() => setValidationError(null)} />}
            data-testid="vision-validation-error"
          />
        </div>
      )}
      {(imageUploadState.fileName || (pendingDocChips && pendingDocChips.length > 0)) && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            paddingBottom: '0.5rem',
          }}
        >
          {imageUploadState.fileName && (
            <FileDetailsLabel
              fileName={imageUploadState.fileName}
              isLoading={imageUploadState.uploading}
              onClose={imageUploadState.uploading ? undefined : onRemoveImage}
              hasTruncation
              variant="outline"
              data-testid="vision-file-preview"
            />
          )}
          {pendingDocChips?.map((chip) => (
            <FileDetailsLabel
              key={chip.id}
              fileName={chip.fileName}
              isLoading={chip.status === 'uploading'}
              onClose={chip.status === 'uploading' ? undefined : () => onRemoveDocChip?.(chip.id)}
              hasTruncation
              variant="outline"
              data-testid={`doc-chip-${chip.id}`}
            />
          ))}
        </div>
      )}
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
          alwayShowSendButton={alwaysShowSendButton}
          data-testid="chatbot-message-bar"
          {...(showAttachButton
            ? {
                attachMenuProps: {
                  isAttachMenuOpen,
                  setIsAttachMenuOpen,
                  attachMenuItems,
                  onAttachMenuToggleClick: () => setIsAttachMenuOpen(!isAttachMenuOpen),
                },
              }
            : {})}
          buttonProps={{
            attach: {
              tooltipContent: 'Attach',
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
      <input
        ref={imageInputRef}
        type="file"
        accept={VISION_UPLOAD_CONFIG.ACCEPTED_EXTENSIONS}
        style={{ display: 'none' }}
        onChange={handleImageFileSelect}
        data-testid="vision-file-input"
      />
      <input
        ref={documentInputRef}
        type="file"
        accept={FILE_UPLOAD_CONFIG.ACCEPTED_EXTENSIONS}
        multiple
        style={{ display: 'none' }}
        onChange={handleDocumentFileSelect}
        data-testid="document-file-input"
      />
      <div style={{ paddingTop: '1rem', textAlign: 'center' }}>
        <ChatbotFootnote label="This chatbot uses AI. Check for mistakes." />
      </div>
    </div>
  );
};

export default ChatbotMessageInput;
