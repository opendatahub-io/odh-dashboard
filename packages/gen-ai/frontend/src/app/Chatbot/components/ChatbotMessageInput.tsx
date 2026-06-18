import * as React from 'react';
import {
  Alert,
  AlertActionCloseButton,
  DropEvent,
  MenuItem,
  MenuList,
  Tooltip,
} from '@patternfly/react-core';
import { ChatbotFootnote, FileDetailsLabel, MessageBar } from '@patternfly/chatbot';
import { FileRejection } from 'react-dropzone';
import { OutlinedFileImageIcon, VolumeUpIcon, OutlinedFileAltIcon } from '@patternfly/react-icons';
import {
  VISION_UPLOAD_CONFIG,
  FILE_UPLOAD_CONFIG,
  ERROR_MESSAGES,
  ALERT_TIMEOUT_MS,
  AUDIO_UPLOAD_CONFIG,
} from '~/app/Chatbot/const';
import { AudioTranscriptionState } from '~/app/Chatbot/hooks/useAudioTranscription';

export interface ImageUploadState {
  uploading: boolean;
  progress: number;
  fileId: string | null;
  previewUrl: string | null;
  fileName: string | null;
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
  imageDisabledTooltip?: string;
  showImageUpload?: boolean;
  showAudioUpload?: boolean;
  isAudioUploadDisabled: boolean;
  audioDisabledTooltip?: string;
  onAudioUpload?: (file: File) => void;
  audioTranscriptionState?: AudioTranscriptionState;
  onAudioCancel?: () => void;
  alwaysShowSendButton?: boolean;
  messageBarValue?: string;
  onMessageBarValueChange?: (value: string) => void;
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
  imageDisabledTooltip,
  showImageUpload = true,
  showAudioUpload = true,
  isAudioUploadDisabled,
  audioDisabledTooltip,
  onAudioUpload,
  audioTranscriptionState,
  onAudioCancel,
  alwaysShowSendButton,
  messageBarValue,
  onMessageBarValueChange,
}) => {
  const [isAttachMenuOpen, setIsAttachMenuOpen] = React.useState(false);
  const [validationError, setValidationError] = React.useState<string | null>(null);
  const imageInputRef = React.useRef<HTMLInputElement>(null);
  const audioInputRef = React.useRef<HTMLInputElement>(null);
  const documentInputRef = React.useRef<HTMLInputElement>(null);
  const messageBarTextareaRef = React.useRef<HTMLTextAreaElement>(null);

  const audioPhase = audioTranscriptionState?.phase || 'idle';
  const isAudioActive = audioPhase === 'uploading' || audioPhase === 'transcribing';

  // PatternFly MessageBar only reads the `value` prop at mount time (internal useState).
  // When messageBarValue changes programmatically (e.g. from transcription), we must
  // force-sync the textarea via native setter + event dispatch.
  React.useEffect(() => {
    const textarea = messageBarTextareaRef.current;
    if (!textarea || messageBarValue === undefined) {
      return;
    }
    if (textarea.value === messageBarValue) {
      return;
    }
    const nativeTextAreaValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLTextAreaElement.prototype,
      'value',
    )?.set;
    if (nativeTextAreaValueSetter) {
      nativeTextAreaValueSetter.call(textarea, messageBarValue);
      textarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }, [messageBarValue]);

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
    } else if (action === 'upload-audio') {
      audioInputRef.current?.click();
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

  const handleAudioFileSelect = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) {
        return;
      }
      // eslint-disable-next-line no-param-reassign
      event.target.value = '';

      let mimeType = file.type;
      if (!mimeType) {
        const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
        mimeType = AUDIO_UPLOAD_CONFIG.EXTENSION_TO_MIME[ext] || '';
      }

      if (!AUDIO_UPLOAD_CONFIG.ALLOWED_MIME_TYPES.includes(mimeType)) {
        setValidationError(
          `${file.name} is not a supported audio file type. Accepted types: WAV, MP3.`,
        );
        return;
      }
      if (file.size > AUDIO_UPLOAD_CONFIG.MAX_FILE_SIZE) {
        setValidationError(
          `${file.name} exceeds maximum size of ${AUDIO_UPLOAD_CONFIG.MAX_FILE_SIZE / (1024 * 1024)} MB. Try a smaller file.`,
        );
        return;
      }
      onAudioUpload?.(file);
    },
    [onAudioUpload],
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

  const audioAnnounceText = React.useMemo(() => {
    if (!audioTranscriptionState) {
      return '';
    }
    switch (audioTranscriptionState.phase) {
      case 'uploading':
        return `Uploading ${audioTranscriptionState.fileName}`;
      case 'transcribing':
        return `Transcribing audio with speech recognition model`;
      case 'complete':
        return 'Transcription ready';
      case 'error':
        return `Transcription failed: ${audioTranscriptionState.error?.title ?? 'Unknown error'}`;
      default:
        return '';
    }
  }, [audioTranscriptionState]);

  const attachMenuItems = React.useMemo(
    () => (
      <MenuList>
        {showImageUpload &&
          (isImageUploadDisabled && imageDisabledTooltip ? (
            <Tooltip content={imageDisabledTooltip} position="left" enableFlip>
              <MenuItem
                icon={<OutlinedFileImageIcon />}
                isAriaDisabled
                data-testid="upload-image-menu-item"
              >
                Upload image
              </MenuItem>
            </Tooltip>
          ) : (
            <MenuItem
              icon={<OutlinedFileImageIcon />}
              isDisabled={isImageUploadDisabled}
              onClick={() => handleMenuSelect('upload-image')}
              data-testid="upload-image-menu-item"
            >
              Upload image
            </MenuItem>
          ))}
        {showAudioUpload &&
          (isAudioUploadDisabled && audioDisabledTooltip ? (
            <Tooltip content={audioDisabledTooltip} position="left" enableFlip>
              <MenuItem icon={<VolumeUpIcon />} isAriaDisabled data-testid="upload-audio-menu-item">
                Upload audio
              </MenuItem>
            </Tooltip>
          ) : (
            <MenuItem
              icon={<VolumeUpIcon />}
              isDisabled={isAudioUploadDisabled}
              onClick={() => handleMenuSelect('upload-audio')}
              data-testid="upload-audio-menu-item"
            >
              Upload audio
            </MenuItem>
          ))}
        <MenuItem
          icon={<OutlinedFileAltIcon />}
          onClick={() => handleMenuSelect('upload-documents')}
        >
          Upload documents
        </MenuItem>
      </MenuList>
    ),
    [
      showImageUpload,
      isImageUploadDisabled,
      imageDisabledTooltip,
      showAudioUpload,
      isAudioUploadDisabled,
      audioDisabledTooltip,
      handleMenuSelect,
    ],
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
      aria-busy={isAudioActive}
    >
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="pf-v6-screen-reader"
        data-testid="audio-aria-live"
      >
        {audioAnnounceText}
      </div>
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
      {audioTranscriptionState?.phase === 'error' && audioTranscriptionState.error && (
        <div style={{ paddingBottom: '0.5rem' }}>
          <Alert
            variant={audioTranscriptionState.error.variant}
            isInline
            title={audioTranscriptionState.error.title}
            actionClose={<AlertActionCloseButton onClose={onAudioCancel} />}
            data-testid="audio-transcription-error"
          >
            <p>{audioTranscriptionState.error.description}</p>
          </Alert>
        </div>
      )}
      {(imageUploadState.fileName || isAudioActive) && (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '0.5rem',
            paddingBottom: '0.5rem',
          }}
          aria-busy={isAudioActive}
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
          {isAudioActive && audioTranscriptionState && (
            <FileDetailsLabel
              fileName={audioTranscriptionState.fileName}
              isLoading
              onClose={onAudioCancel}
              hasTruncation
              variant="outline"
              data-testid="audio-file-chip"
            />
          )}
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
          innerRef={messageBarTextareaRef}
          handleStopButton={onStopStreaming}
          hasAttachButton={showAttachButton}
          isSendButtonDisabled={isSendDisabled}
          hasStopButton={isLoading}
          alwayShowSendButton={alwaysShowSendButton}
          data-testid="chatbot-message-bar"
          {...(messageBarValue !== undefined
            ? {
                value: messageBarValue,
                onChange: (_e: React.ChangeEvent<HTMLTextAreaElement>, val: string | number) =>
                  onMessageBarValueChange?.(String(val)),
              }
            : {})}
          {...(audioPhase === 'transcribing'
            ? {
                placeholder: 'Transcribing audio… This may take up to 2 minutes.',
                readOnly: true,
              }
            : {})}
          {...(showAttachButton
            ? {
                attachMenuProps: {
                  isAttachMenuOpen: isAudioActive ? false : isAttachMenuOpen,
                  setIsAttachMenuOpen,
                  attachMenuItems,
                  onAttachMenuToggleClick: () => {
                    if (!isAudioActive) {
                      setIsAttachMenuOpen(!isAttachMenuOpen);
                    }
                  },
                },
              }
            : {})}
          buttonProps={{
            attach: {
              tooltipContent: 'Attach',
              inputTestId: 'chatbot-attach-input',
              // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
              props: {
                disabled: isAudioActive,
                'aria-disabled': isAudioActive,
              } as React.ComponentProps<'button'>,
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
      {showImageUpload && (
        <input
          ref={imageInputRef}
          type="file"
          accept={VISION_UPLOAD_CONFIG.ACCEPTED_EXTENSIONS}
          style={{ display: 'none' }}
          onChange={handleImageFileSelect}
          data-testid="vision-file-input"
        />
      )}
      {showAudioUpload && (
        <input
          ref={audioInputRef}
          type="file"
          accept={AUDIO_UPLOAD_CONFIG.ACCEPTED_EXTENSIONS}
          style={{ display: 'none' }}
          onChange={handleAudioFileSelect}
          data-testid="audio-file-input"
        />
      )}
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
