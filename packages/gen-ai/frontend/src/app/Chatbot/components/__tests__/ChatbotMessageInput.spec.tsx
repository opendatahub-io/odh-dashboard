import * as React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatbotMessageInput, {
  ImageUploadState,
} from '~/app/Chatbot/components/ChatbotMessageInput';
import { VISION_UPLOAD_CONFIG, AUDIO_UPLOAD_CONFIG } from '~/app/Chatbot/const';
import { AudioTranscriptionState } from '~/app/Chatbot/hooks/useAudioTranscription';

jest.mock('@patternfly/chatbot', () => ({
  MessageBar: ({
    onSendMessage,
    handleStopButton,
    hasAttachButton,
    isSendButtonDisabled,
    hasStopButton,
    attachMenuProps,
    'data-testid': testId,
  }: {
    onSendMessage: (message: string) => void;
    handleStopButton: () => void;
    hasAttachButton: boolean;
    isSendButtonDisabled: boolean;
    hasStopButton: boolean;
    attachMenuProps?: {
      isAttachMenuOpen: boolean;
      setIsAttachMenuOpen: (open: boolean) => void;
      attachMenuItems: React.ReactNode;
      onAttachMenuToggleClick: () => void;
    };
    'data-testid': string;
  }) => (
    <div data-testid={testId}>
      <input
        data-testid="mock-message-input"
        onChange={(e) => onSendMessage(e.target.value)}
        disabled={isSendButtonDisabled}
      />
      <button
        data-testid="mock-send-button"
        onClick={() => onSendMessage('test message')}
        disabled={isSendButtonDisabled}
        type="button"
      >
        Send
      </button>
      {hasStopButton && (
        <button data-testid="mock-stop-button" onClick={handleStopButton} type="button">
          Stop
        </button>
      )}
      {hasAttachButton && attachMenuProps && (
        <div data-testid="mock-attach-menu">
          <button
            data-testid="mock-attach-toggle"
            onClick={attachMenuProps.onAttachMenuToggleClick}
            type="button"
          >
            Attach
          </button>
          {attachMenuProps.isAttachMenuOpen && (
            <div data-testid="mock-menu-items">{attachMenuProps.attachMenuItems}</div>
          )}
        </div>
      )}
    </div>
  ),
  ChatbotFootnote: ({ label }: { label: string }) => <div data-testid="mock-footnote">{label}</div>,
  FileDetailsLabel: ({
    fileName,
    isLoading,
    onClose,
    'data-testid': testId,
  }: {
    fileName: string;
    isLoading?: boolean;
    onClose?: (event: React.MouseEvent) => void;
    'data-testid'?: string;
  }) => (
    <div data-testid={testId || 'file-details-label'}>
      <span data-testid="file-name">{fileName}</span>
      {isLoading && <span data-testid="file-loading-spinner">Loading...</span>}
      {!isLoading && onClose && (
        <button data-testid="file-close-button" onClick={(e) => onClose(e)} type="button">
          Close
        </button>
      )}
    </div>
  ),
}));

jest.mock('@patternfly/react-core', () => ({
  ...jest.requireActual('@patternfly/react-core'),
  MenuItem: ({
    children,
    icon,
    isDisabled,
    isAriaDisabled,
    onClick,
  }: {
    children: React.ReactNode;
    icon?: React.ReactNode;
    isDisabled?: boolean;
    isAriaDisabled?: boolean;
    onClick?: () => void;
  }) => {
    const label = typeof children === 'string' ? children : 'unknown';
    return (
      <button
        data-testid={`menu-item-${label.replace(/\s+/g, '-').toLowerCase()}`}
        onClick={isDisabled || isAriaDisabled ? undefined : onClick}
        disabled={isDisabled}
        aria-disabled={isAriaDisabled}
        type="button"
      >
        {icon}
        {children}
      </button>
    );
  },
  MenuList: ({ children }: { children: React.ReactNode }) => (
    <ul data-testid="mock-menu-list">{children}</ul>
  ),
  Tooltip: ({
    children,
    content,
    position,
  }: {
    children: React.ReactNode;
    content?: string;
    position?: string;
  }) => (
    <span
      data-testid="tooltip-wrapper"
      data-tooltip-content={content}
      data-tooltip-position={position}
    >
      {children}
    </span>
  ),
}));

jest.mock('@patternfly/react-icons', () => ({
  OutlinedFileImageIcon: () => <span data-testid="icon-image" />,
  VolumeUpIcon: () => <span data-testid="icon-audio" />,
  OutlinedFileAltIcon: () => <span data-testid="icon-document" />,
}));

describe('ChatbotMessageInput', () => {
  const defaultImageUploadState: ImageUploadState = {
    uploading: false,
    progress: 0,
    fileId: null,
    previewUrl: null,
    fileName: null,
  };

  const defaultProps = {
    onSendMessage: jest.fn(),
    onStopStreaming: jest.fn(),
    isLoading: false,
    isSendDisabled: false,
    onImageUpload: jest.fn(),
    imageUploadState: defaultImageUploadState,
    onRemoveImage: jest.fn(),
    isImageUploadDisabled: false,
    isAudioUploadDisabled: true,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the message bar', () => {
    render(<ChatbotMessageInput {...defaultProps} />);
    expect(screen.getByTestId('chatbot-message-bar')).toBeInTheDocument();
  });

  it('renders the footnote with AI warning', () => {
    render(<ChatbotMessageInput {...defaultProps} />);
    expect(screen.getByTestId('mock-footnote')).toHaveTextContent(
      'This chatbot uses AI. Check for mistakes.',
    );
  });

  it('calls onSendMessage when a message is sent', async () => {
    const user = userEvent.setup();
    const mockOnSendMessage = jest.fn();
    render(<ChatbotMessageInput {...defaultProps} onSendMessage={mockOnSendMessage} />);

    const sendButton = screen.getByTestId('mock-send-button');
    await user.click(sendButton);

    expect(mockOnSendMessage).toHaveBeenCalledWith('test message');
  });

  it('shows stop button when isLoading is true', () => {
    render(<ChatbotMessageInput {...defaultProps} isLoading />);
    expect(screen.getByTestId('mock-stop-button')).toBeInTheDocument();
  });

  it('does not show stop button when isLoading is false', () => {
    render(<ChatbotMessageInput {...defaultProps} isLoading={false} />);
    expect(screen.queryByTestId('mock-stop-button')).not.toBeInTheDocument();
  });

  it('disables send button when isSendDisabled is true', () => {
    render(<ChatbotMessageInput {...defaultProps} isSendDisabled />);
    expect(screen.getByTestId('mock-send-button')).toBeDisabled();
  });

  it('hides attach menu when showAttachButton is false', () => {
    render(<ChatbotMessageInput {...defaultProps} showAttachButton={false} />);
    expect(screen.queryByTestId('mock-attach-menu')).not.toBeInTheDocument();
  });

  describe('attach menu', () => {
    it('renders attach menu toggle', () => {
      render(<ChatbotMessageInput {...defaultProps} />);
      expect(screen.getByTestId('mock-attach-toggle')).toBeInTheDocument();
    });

    it('opens attach menu on toggle click and shows three menu items', async () => {
      const user = userEvent.setup();
      render(<ChatbotMessageInput {...defaultProps} />);

      await user.click(screen.getByTestId('mock-attach-toggle'));

      expect(screen.getByTestId('menu-item-upload-image')).toBeInTheDocument();
      expect(screen.getByTestId('menu-item-upload-audio')).toBeInTheDocument();
      expect(screen.getByTestId('menu-item-upload-documents')).toBeInTheDocument();
    });

    it('disables "Upload image" when isImageUploadDisabled is true (no tooltip)', async () => {
      const user = userEvent.setup();
      render(<ChatbotMessageInput {...defaultProps} isImageUploadDisabled />);

      await user.click(screen.getByTestId('mock-attach-toggle'));

      const imageItem = screen.getByTestId('menu-item-upload-image');
      expect(imageItem).toBeDisabled();
    });

    it('"Upload image" uses isAriaDisabled with tooltip when imageDisabledTooltip is provided', async () => {
      const user = userEvent.setup();
      render(
        <ChatbotMessageInput
          {...defaultProps}
          isImageUploadDisabled
          imageDisabledTooltip="Switch to a vision-capable model to upload images."
        />,
      );

      await user.click(screen.getByTestId('mock-attach-toggle'));

      const imageItem = screen.getByTestId('menu-item-upload-image');
      expect(imageItem).toHaveAttribute('aria-disabled', 'true');
      expect(imageItem).not.toBeDisabled();
      const tooltipWrapper = screen.getAllByTestId('tooltip-wrapper')[0];
      expect(tooltipWrapper).toHaveAttribute(
        'data-tooltip-content',
        'Switch to a vision-capable model to upload images.',
      );
    });

    it('hides "Upload image" when showImageUpload is false', async () => {
      const user = userEvent.setup();
      render(<ChatbotMessageInput {...defaultProps} showImageUpload={false} />);

      await user.click(screen.getByTestId('mock-attach-toggle'));

      expect(screen.queryByTestId('menu-item-upload-image')).not.toBeInTheDocument();
      expect(screen.queryByTestId('vision-file-input')).not.toBeInTheDocument();
    });

    it('hides "Upload audio" when showAudioUpload is false', async () => {
      const user = userEvent.setup();
      render(<ChatbotMessageInput {...defaultProps} showAudioUpload={false} />);

      await user.click(screen.getByTestId('mock-attach-toggle'));

      expect(screen.queryByTestId('menu-item-upload-audio')).not.toBeInTheDocument();
      expect(screen.queryByTestId('audio-file-input')).not.toBeInTheDocument();
    });

    it('shows only "Upload documents" when both image and audio are hidden', async () => {
      const user = userEvent.setup();
      render(
        <ChatbotMessageInput {...defaultProps} showImageUpload={false} showAudioUpload={false} />,
      );

      await user.click(screen.getByTestId('mock-attach-toggle'));

      expect(screen.queryByTestId('menu-item-upload-image')).not.toBeInTheDocument();
      expect(screen.queryByTestId('menu-item-upload-audio')).not.toBeInTheDocument();
      expect(screen.getByTestId('menu-item-upload-documents')).toBeInTheDocument();
    });

    it('"Upload audio" is disabled when isAudioUploadDisabled is true', async () => {
      const user = userEvent.setup();
      render(<ChatbotMessageInput {...defaultProps} isAudioUploadDisabled />);

      await user.click(screen.getByTestId('mock-attach-toggle'));

      const audioItem = screen.getByTestId('menu-item-upload-audio');
      expect(audioItem).toBeDisabled();
    });

    it('"Upload audio" uses isAriaDisabled with tooltip when audioDisabledTooltip is provided', async () => {
      const user = userEvent.setup();
      render(
        <ChatbotMessageInput
          {...defaultProps}
          isAudioUploadDisabled
          audioDisabledTooltip="Select a transcription model"
        />,
      );

      await user.click(screen.getByTestId('mock-attach-toggle'));

      const audioItem = screen.getByTestId('menu-item-upload-audio');
      expect(audioItem).toHaveAttribute('aria-disabled', 'true');
      expect(audioItem).not.toBeDisabled();
      const tooltipWrapper = screen.getByTestId('tooltip-wrapper');
      expect(tooltipWrapper).toHaveAttribute(
        'data-tooltip-content',
        'Select a transcription model',
      );
    });

    it('tooltip is positioned to the left of the disabled audio menu item', async () => {
      const user = userEvent.setup();
      render(
        <ChatbotMessageInput
          {...defaultProps}
          isAudioUploadDisabled
          audioDisabledTooltip="Select a transcription model"
        />,
      );

      await user.click(screen.getByTestId('mock-attach-toggle'));

      const tooltipWrapper = screen.getByTestId('tooltip-wrapper');
      expect(tooltipWrapper).toHaveAttribute('data-tooltip-position', 'left');
    });

    it('"Upload audio" is enabled when isAudioUploadDisabled is false', async () => {
      const user = userEvent.setup();
      render(<ChatbotMessageInput {...defaultProps} isAudioUploadDisabled={false} />);

      await user.click(screen.getByTestId('mock-attach-toggle'));

      const audioItem = screen.getByTestId('menu-item-upload-audio');
      expect(audioItem).not.toBeDisabled();
    });

    it('clicking "Upload image" triggers the hidden file input', async () => {
      const user = userEvent.setup();
      render(<ChatbotMessageInput {...defaultProps} />);

      const fileInput = screen.getByTestId('vision-file-input') as HTMLInputElement;
      const clickSpy = jest.spyOn(fileInput, 'click');

      await user.click(screen.getByTestId('mock-attach-toggle'));
      await user.click(screen.getByTestId('menu-item-upload-image'));

      expect(clickSpy).toHaveBeenCalled();
      clickSpy.mockRestore();
    });

    it('clicking "Upload documents" triggers the hidden document file input', async () => {
      const user = userEvent.setup();
      render(<ChatbotMessageInput {...defaultProps} />);

      const fileInput = screen.getByTestId('document-file-input') as HTMLInputElement;
      const clickSpy = jest.spyOn(fileInput, 'click');

      await user.click(screen.getByTestId('mock-attach-toggle'));
      await user.click(screen.getByTestId('menu-item-upload-documents'));

      expect(clickSpy).toHaveBeenCalled();
      clickSpy.mockRestore();
    });

    it('does not trigger file input when "Upload image" is disabled', async () => {
      const user = userEvent.setup();
      render(<ChatbotMessageInput {...defaultProps} isImageUploadDisabled />);

      const fileInput = screen.getByTestId('vision-file-input') as HTMLInputElement;
      const clickSpy = jest.spyOn(fileInput, 'click');

      await user.click(screen.getByTestId('mock-attach-toggle'));
      await user.click(screen.getByTestId('menu-item-upload-image'));

      expect(clickSpy).not.toHaveBeenCalled();
      clickSpy.mockRestore();
    });
  });

  describe('image upload via hidden input', () => {
    it('triggers onImageUpload when a valid image file is selected', () => {
      const mockOnImageUpload = jest.fn();
      render(<ChatbotMessageInput {...defaultProps} onImageUpload={mockOnImageUpload} />);

      const fileInput = screen.getByTestId('vision-file-input') as HTMLInputElement;
      const file = new File(['image-data'], 'photo.jpg', { type: 'image/jpeg' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      expect(mockOnImageUpload).toHaveBeenCalledWith(file);
    });

    it('shows validation error for unsupported file type', () => {
      render(<ChatbotMessageInput {...defaultProps} />);

      const fileInput = screen.getByTestId('vision-file-input') as HTMLInputElement;
      const file = new File(['data'], 'document.gif', { type: 'image/gif' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      expect(screen.getByTestId('vision-validation-error')).toBeInTheDocument();
      expect(screen.getByText(/is not a supported file type/)).toBeInTheDocument();
    });

    it('shows validation error for file exceeding size limit', () => {
      render(<ChatbotMessageInput {...defaultProps} />);

      const fileInput = screen.getByTestId('vision-file-input') as HTMLInputElement;
      const largeContent = new Uint8Array(VISION_UPLOAD_CONFIG.MAX_FILE_SIZE + 1);
      const file = new File([largeContent], 'huge.png', { type: 'image/png' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      expect(screen.getByTestId('vision-validation-error')).toBeInTheDocument();
      expect(screen.getByText(/exceeds maximum size/)).toBeInTheDocument();
    });

    it('auto-dismisses validation error after timeout', async () => {
      jest.useFakeTimers();
      try {
        render(<ChatbotMessageInput {...defaultProps} />);

        const fileInput = screen.getByTestId('vision-file-input') as HTMLInputElement;
        const file = new File(['data'], 'bad.gif', { type: 'image/gif' });
        fireEvent.change(fileInput, { target: { files: [file] } });

        expect(screen.getByTestId('vision-validation-error')).toBeInTheDocument();

        jest.advanceTimersByTime(8000);

        await waitFor(() => {
          expect(screen.queryByTestId('vision-validation-error')).not.toBeInTheDocument();
        });
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('image preview chip', () => {
    it('renders FileDetailsLabel when a file name is present', () => {
      render(
        <ChatbotMessageInput
          {...defaultProps}
          imageUploadState={{ ...defaultImageUploadState, fileName: 'test.jpg' }}
        />,
      );

      expect(screen.getByTestId('vision-file-preview')).toBeInTheDocument();
      expect(screen.getByTestId('file-name')).toHaveTextContent('test.jpg');
    });

    it('does not render FileDetailsLabel when no file name', () => {
      render(<ChatbotMessageInput {...defaultProps} />);
      expect(screen.queryByTestId('vision-file-preview')).not.toBeInTheDocument();
    });

    it('shows loading spinner during upload', () => {
      render(
        <ChatbotMessageInput
          {...defaultProps}
          imageUploadState={{
            ...defaultImageUploadState,
            fileName: 'uploading.png',
            uploading: true,
          }}
        />,
      );

      expect(screen.getByTestId('file-loading-spinner')).toBeInTheDocument();
      expect(screen.queryByTestId('file-close-button')).not.toBeInTheDocument();
    });

    it('shows close button when upload is complete', () => {
      render(
        <ChatbotMessageInput
          {...defaultProps}
          imageUploadState={{
            ...defaultImageUploadState,
            fileName: 'done.jpg',
            uploading: false,
            fileId: 'file-123',
          }}
        />,
      );

      expect(screen.queryByTestId('file-loading-spinner')).not.toBeInTheDocument();
      expect(screen.getByTestId('file-close-button')).toBeInTheDocument();
    });

    it('calls onRemoveImage when close button is clicked', async () => {
      const user = userEvent.setup();
      const mockOnRemoveImage = jest.fn();
      render(
        <ChatbotMessageInput
          {...defaultProps}
          onRemoveImage={mockOnRemoveImage}
          imageUploadState={{
            ...defaultImageUploadState,
            fileName: 'remove-me.jpg',
            uploading: false,
            fileId: 'file-456',
          }}
        />,
      );

      await user.click(screen.getByTestId('file-close-button'));
      expect(mockOnRemoveImage).toHaveBeenCalledTimes(1);
    });
  });

  describe('styling', () => {
    it('applies light mode background', () => {
      const { container } = render(<ChatbotMessageInput {...defaultProps} isDarkMode={false} />);
      const outerDiv = container.firstChild as HTMLElement;
      expect(outerDiv).toHaveStyle({
        backgroundColor: 'var(--pf-t--global--background--color--100)',
      });
    });

    it('applies dark mode background', () => {
      const { container } = render(<ChatbotMessageInput {...defaultProps} isDarkMode />);
      const outerDiv = container.firstChild as HTMLElement;
      expect(outerDiv).toHaveStyle({
        backgroundColor: 'var(--pf-t--global--dark--background--color--100)',
      });
    });
  });

  describe('document file validation', () => {
    const onDocumentAttach = jest.fn();

    beforeEach(() => {
      onDocumentAttach.mockClear();
    });

    it('rejects unsupported file types and shows validation error', async () => {
      const user = userEvent.setup();
      render(<ChatbotMessageInput {...defaultProps} onDocumentAttach={onDocumentAttach} />);

      // Open menu and click "Upload documents"
      await user.click(screen.getByTestId('mock-attach-toggle'));
      await user.click(screen.getByTestId('menu-item-upload-documents'));

      // Set an .exe file on the document input
      const input = screen.getByTestId('document-file-input') as HTMLInputElement;
      const badFile = new File(['data'], 'malware.exe', { type: 'application/x-msdownload' });
      Object.defineProperty(input, 'files', {
        value: [badFile],
        configurable: true,
      });
      Object.defineProperty(input, 'length', { value: 1, configurable: true });
      fireEvent.change(input);

      await waitFor(() => {
        expect(screen.getByTestId('vision-validation-error')).toBeInTheDocument();
      });
      expect(onDocumentAttach).not.toHaveBeenCalled();
    });

    it('rejects oversized files and shows validation error', async () => {
      const user = userEvent.setup();
      render(<ChatbotMessageInput {...defaultProps} onDocumentAttach={onDocumentAttach} />);

      await user.click(screen.getByTestId('mock-attach-toggle'));
      await user.click(screen.getByTestId('menu-item-upload-documents'));

      const input = screen.getByTestId('document-file-input') as HTMLInputElement;
      // 11MB file exceeds 10MB limit
      const bigFile = new File(['x'.repeat(11 * 1024 * 1024)], 'huge.txt', {
        type: 'text/plain',
      });
      Object.defineProperty(input, 'files', { value: [bigFile], configurable: true });
      fireEvent.change(input);

      await waitFor(() => {
        expect(screen.getByTestId('vision-validation-error')).toBeInTheDocument();
      });
      expect(onDocumentAttach).not.toHaveBeenCalled();
    });

    it('passes only valid files from a mixed batch', async () => {
      const user = userEvent.setup();
      render(<ChatbotMessageInput {...defaultProps} onDocumentAttach={onDocumentAttach} />);

      await user.click(screen.getByTestId('mock-attach-toggle'));
      await user.click(screen.getByTestId('menu-item-upload-documents'));

      const input = screen.getByTestId('document-file-input') as HTMLInputElement;
      const validFile = new File(['valid'], 'good.txt', { type: 'text/plain' });
      const invalidFile = new File(['bad'], 'bad.exe', { type: 'application/x-msdownload' });

      const mockFileList = [validFile, invalidFile] as unknown as FileList;
      Object.defineProperty(mockFileList, 'length', { value: 2 });
      Object.defineProperty(mockFileList, 'item', {
        value: (i: number) => [validFile, invalidFile][i],
      });
      Object.defineProperty(input, 'files', { value: mockFileList, configurable: true });
      fireEvent.change(input);

      // Validation error shown for the rejected file
      await waitFor(() => {
        expect(screen.getByTestId('vision-validation-error')).toBeInTheDocument();
      });
      // But valid file was still passed to onDocumentAttach
      expect(onDocumentAttach).toHaveBeenCalledWith([validFile], [], expect.any(Event));
    });

    it('validation error auto-dismisses after timeout', async () => {
      jest.useFakeTimers();
      const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
      render(<ChatbotMessageInput {...defaultProps} onDocumentAttach={onDocumentAttach} />);

      await user.click(screen.getByTestId('mock-attach-toggle'));
      await user.click(screen.getByTestId('menu-item-upload-documents'));

      const input = screen.getByTestId('document-file-input') as HTMLInputElement;
      const badFile = new File(['x'], 'bad.exe', { type: 'application/x-msdownload' });
      Object.defineProperty(input, 'files', { value: [badFile], configurable: true });
      fireEvent.change(input);

      expect(screen.getByTestId('vision-validation-error')).toBeInTheDocument();

      // Advance past ALERT_TIMEOUT_MS (8000ms)
      jest.advanceTimersByTime(8100);

      await waitFor(() => {
        expect(screen.queryByTestId('vision-validation-error')).not.toBeInTheDocument();
      });

      jest.useRealTimers();
    });
  });

  describe('alwaysShowSendButton', () => {
    it('passes alwayShowSendButton to MessageBar when true', () => {
      const { container } = render(<ChatbotMessageInput {...defaultProps} alwaysShowSendButton />);
      const messageBar = container.querySelector('[data-testid="chatbot-message-bar"]');
      expect(messageBar).toBeInTheDocument();
    });

    it('passes alwayShowSendButton=false to MessageBar when prop is false', () => {
      const { container } = render(
        <ChatbotMessageInput {...defaultProps} alwaysShowSendButton={false} />,
      );
      const messageBar = container.querySelector('[data-testid="chatbot-message-bar"]');
      expect(messageBar).toBeInTheDocument();
    });
  });

  describe('audio upload', () => {
    const defaultAudioState: AudioTranscriptionState = {
      phase: 'idle',
      fileName: '',
      uploadProgress: 0,
      error: null,
      transcribedText: '',
    };

    it('clicking "Upload audio" triggers the hidden audio file input', async () => {
      const user = userEvent.setup();
      const mockOnAudioUpload = jest.fn();
      render(
        <ChatbotMessageInput
          {...defaultProps}
          isAudioUploadDisabled={false}
          onAudioUpload={mockOnAudioUpload}
          audioTranscriptionState={defaultAudioState}
        />,
      );

      const fileInput = screen.getByTestId('audio-file-input') as HTMLInputElement;
      const clickSpy = jest.spyOn(fileInput, 'click');

      await user.click(screen.getByTestId('mock-attach-toggle'));
      await user.click(screen.getByTestId('menu-item-upload-audio'));

      expect(clickSpy).toHaveBeenCalled();
      clickSpy.mockRestore();
    });

    it('calls onAudioUpload with valid WAV file', () => {
      const mockOnAudioUpload = jest.fn();
      render(
        <ChatbotMessageInput
          {...defaultProps}
          isAudioUploadDisabled={false}
          onAudioUpload={mockOnAudioUpload}
          audioTranscriptionState={defaultAudioState}
        />,
      );

      const fileInput = screen.getByTestId('audio-file-input') as HTMLInputElement;
      const file = new File(['audio-data'], 'recording.wav', { type: 'audio/wav' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      expect(mockOnAudioUpload).toHaveBeenCalledWith(file);
    });

    it('calls onAudioUpload with valid MP3 file', () => {
      const mockOnAudioUpload = jest.fn();
      render(
        <ChatbotMessageInput
          {...defaultProps}
          isAudioUploadDisabled={false}
          onAudioUpload={mockOnAudioUpload}
          audioTranscriptionState={defaultAudioState}
        />,
      );

      const fileInput = screen.getByTestId('audio-file-input') as HTMLInputElement;
      const file = new File(['audio-data'], 'song.mp3', { type: 'audio/mpeg' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      expect(mockOnAudioUpload).toHaveBeenCalledWith(file);
    });

    it('rejects unsupported audio file type', () => {
      const mockOnAudioUpload = jest.fn();
      render(
        <ChatbotMessageInput
          {...defaultProps}
          isAudioUploadDisabled={false}
          onAudioUpload={mockOnAudioUpload}
          audioTranscriptionState={defaultAudioState}
        />,
      );

      const fileInput = screen.getByTestId('audio-file-input') as HTMLInputElement;
      const file = new File(['audio-data'], 'track.ogg', { type: 'audio/ogg' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      expect(mockOnAudioUpload).not.toHaveBeenCalled();
      expect(screen.getByTestId('vision-validation-error')).toBeInTheDocument();
      expect(screen.getByText(/not a supported audio file type/)).toBeInTheDocument();
    });

    it('rejects audio file exceeding size limit', () => {
      const mockOnAudioUpload = jest.fn();
      render(
        <ChatbotMessageInput
          {...defaultProps}
          isAudioUploadDisabled={false}
          onAudioUpload={mockOnAudioUpload}
          audioTranscriptionState={defaultAudioState}
        />,
      );

      const fileInput = screen.getByTestId('audio-file-input') as HTMLInputElement;
      const largeContent = new Uint8Array(AUDIO_UPLOAD_CONFIG.MAX_FILE_SIZE + 1);
      const file = new File([largeContent], 'big.wav', { type: 'audio/wav' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      expect(mockOnAudioUpload).not.toHaveBeenCalled();
      expect(screen.getByTestId('vision-validation-error')).toBeInTheDocument();
      expect(screen.getByText(/exceeds maximum size/)).toBeInTheDocument();
    });

    it('uses extension fallback when MIME type is empty', () => {
      const mockOnAudioUpload = jest.fn();
      render(
        <ChatbotMessageInput
          {...defaultProps}
          isAudioUploadDisabled={false}
          onAudioUpload={mockOnAudioUpload}
          audioTranscriptionState={defaultAudioState}
        />,
      );

      const fileInput = screen.getByTestId('audio-file-input') as HTMLInputElement;
      const file = new File(['audio-data'], 'recording.wav', { type: '' });
      fireEvent.change(fileInput, { target: { files: [file] } });

      expect(mockOnAudioUpload).toHaveBeenCalledWith(file);
    });

    it('shows audio chip during uploading phase', () => {
      render(
        <ChatbotMessageInput
          {...defaultProps}
          isAudioUploadDisabled={false}
          audioTranscriptionState={{
            ...defaultAudioState,
            phase: 'uploading',
            fileName: 'recording.wav',
          }}
          onAudioCancel={jest.fn()}
        />,
      );

      expect(screen.getByTestId('audio-file-chip')).toBeInTheDocument();
    });

    it('shows audio chip during transcribing phase', () => {
      render(
        <ChatbotMessageInput
          {...defaultProps}
          isAudioUploadDisabled={false}
          audioTranscriptionState={{
            ...defaultAudioState,
            phase: 'transcribing',
            fileName: 'recording.wav',
          }}
          onAudioCancel={jest.fn()}
        />,
      );

      expect(screen.getByTestId('audio-file-chip')).toBeInTheDocument();
    });

    it('passes onAudioCancel as onClose to audio chip', () => {
      const mockOnAudioCancel = jest.fn();
      render(
        <ChatbotMessageInput
          {...defaultProps}
          isAudioUploadDisabled={false}
          audioTranscriptionState={{
            ...defaultAudioState,
            phase: 'uploading',
            fileName: 'recording.wav',
          }}
          onAudioCancel={mockOnAudioCancel}
        />,
      );

      expect(screen.getByTestId('audio-file-chip')).toBeInTheDocument();
    });

    it('shows error Alert when audio transcription fails', () => {
      render(
        <ChatbotMessageInput
          {...defaultProps}
          isAudioUploadDisabled={false}
          audioTranscriptionState={{
            ...defaultAudioState,
            phase: 'error',
            error: {
              pattern: 'full-failure',
              variant: 'danger',
              title: 'Transcription timed out',
              description:
                'The transcription took too long. The audio file may be too large or the model is overloaded.',
              details: {
                component: 'Audio Transcription',
                errorCode: 'timeout',
                rawMessage: 'Client-side timeout exceeded',
              },
              isRetriable: true,
            },
          }}
          onAudioCancel={jest.fn()}
        />,
      );

      const alert = screen.getByTestId('audio-transcription-error');
      expect(alert).toBeInTheDocument();
      expect(screen.getByText('Transcription timed out')).toBeInTheDocument();
      expect(screen.getByText(/The transcription took too long/)).toBeInTheDocument();
    });

    it('shows aria-live announcement during transcription', () => {
      render(
        <ChatbotMessageInput
          {...defaultProps}
          isAudioUploadDisabled={false}
          audioTranscriptionState={{
            ...defaultAudioState,
            phase: 'transcribing',
            fileName: 'recording.wav',
          }}
        />,
      );

      const liveRegion = screen.getByTestId('audio-aria-live');
      expect(liveRegion).toHaveTextContent('Transcribing audio');
    });

    it('sets aria-busy on wrapper during active transcription phases', () => {
      const { container } = render(
        <ChatbotMessageInput
          {...defaultProps}
          isAudioUploadDisabled={false}
          audioTranscriptionState={{
            ...defaultAudioState,
            phase: 'uploading',
            fileName: 'recording.wav',
          }}
        />,
      );

      const outerDiv = container.firstChild as HTMLElement;
      expect(outerDiv).toHaveAttribute('aria-busy', 'true');
    });

    it('does not set aria-busy when idle', () => {
      const { container } = render(
        <ChatbotMessageInput
          {...defaultProps}
          isAudioUploadDisabled={false}
          audioTranscriptionState={defaultAudioState}
        />,
      );

      const outerDiv = container.firstChild as HTMLElement;
      expect(outerDiv).toHaveAttribute('aria-busy', 'false');
    });

    it('does not show audio chip when idle', () => {
      render(
        <ChatbotMessageInput
          {...defaultProps}
          isAudioUploadDisabled={false}
          audioTranscriptionState={defaultAudioState}
        />,
      );

      expect(screen.queryByTestId('audio-file-chip')).not.toBeInTheDocument();
    });
  });
});
