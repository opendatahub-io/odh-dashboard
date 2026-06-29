/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-shadow, react/no-unused-prop-types */
import * as React from 'react';
import { render, screen, act, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// ───────────────────── Mock functions ─────────────────────

const mockHandleSourceDrop = jest.fn().mockResolvedValue(undefined);
const mockRemoveUploadedSource = jest.fn();
const mockDeleteFileById = jest.fn().mockResolvedValue(undefined);
const mockRefreshFiles = jest.fn().mockResolvedValue(undefined);
const mockOnShowErrorAlert = jest.fn();
const mockHandleMessageSend = jest.fn().mockResolvedValue(undefined);

let mockFilesWithSettings: Array<{
  id: string;
  file: File;
  settings: null;
  status: string;
}> = [];
let mockFileManagementFiles: Array<{ id: string; filename: string }> = [];

// ───────────────────── Module mocks ─────────────────────

jest.mock('~/app/Chatbot/hooks/useSourceManagement', () => ({
  __esModule: true,
  default: () => ({
    selectedSourceSettings: null,
    isSourceSettingsOpen: false,
    autoEnableRag: false,
    get filesWithSettings() {
      return mockFilesWithSettings;
    },
    currentFileForSettings: null,
    pendingFiles: [],
    isUploading: false,
    uploadProgress: { current: 0, total: 0 },
    setAutoEnableRag: jest.fn(),
    handleSourceDrop: mockHandleSourceDrop,
    removeUploadedSource: mockRemoveUploadedSource,
    handleSourceSettingsSubmit: jest.fn(),
    handleModalClose: jest.fn(),
    setIsSourceSettingsOpen: jest.fn(),
    setSelectedSourceSettings: jest.fn(),
  }),
}));

jest.mock('~/app/Chatbot/hooks/useFileManagement', () => ({
  __esModule: true,
  default: () => ({
    get files() {
      return mockFileManagementFiles;
    },
    isLoading: false,
    error: null,
    refreshFiles: mockRefreshFiles,
    deleteFileById: mockDeleteFileById,
    isDeleting: false,
    currentVectorStoreId: 'vs-test-123',
  }),
}));

jest.mock('~/app/Chatbot/hooks/useAlertManagement', () => ({
  __esModule: true,
  default: () => ({
    showUploadSuccessAlert: false,
    showDeleteSuccessAlert: false,
    showErrorAlert: false,
    errorAlertKey: 0,
    errorMessage: '',
    errorTitle: '',
    onShowUploadSuccessAlert: jest.fn(),
    onShowDeleteSuccessAlert: jest.fn(),
    onShowErrorAlert: mockOnShowErrorAlert,
    onHideUploadSuccessAlert: jest.fn(),
    onHideDeleteSuccessAlert: jest.fn(),
    onHideErrorAlert: jest.fn(),
  }),
}));

jest.mock('~/app/Chatbot/hooks/useChatbotMessages', () => ({
  __esModule: true,
  default: () => ({
    messages: [],
    isLoading: false,
    isStreamingWithoutContent: false,
    isMessageSendButtonDisabled: false,
    modelDisplayName: 'Test Model',
    scrollToBottomRef: { current: null },
    handleMessageSend: mockHandleMessageSend,
    handleStopStreaming: jest.fn(),
    clearConversation: jest.fn(),
    lastResponseMetrics: null,
  }),
}));

jest.mock('~/app/Chatbot/hooks/useDarkMode', () => ({
  __esModule: true,
  default: () => false,
}));

jest.mock('~/app/hooks/useFetchBFFConfig', () => ({
  __esModule: true,
  default: () => ({ data: null, isLoading: false }),
}));

jest.mock('~/app/hooks/useFetchMCPServers', () => ({
  __esModule: true,
  default: () => ({ data: [], loaded: true, error: undefined }),
}));

jest.mock('~/app/hooks/useMCPServerStatuses', () => ({
  __esModule: true,
  default: () => ({
    serverStatuses: new Map(),
    checkServerStatus: jest.fn(),
  }),
}));

jest.mock('~/app/services/llamaStackService', () => ({
  uploadMediaFile: jest.fn(),
  transcribeAudio: jest.fn(),
}));

jest.mock('~/app/context/UserContext', () => ({
  useUserContext: () => ({
    username: 'test-user',
    userAvatar: '',
  }),
}));

jest.mock('~/app/context/ChatbotContext', () => {
  const { createContext } = require('react');
  return {
    ChatbotContext: createContext({
      models: [{ id: 'test-model', name: 'Test Model' }],
      modelsLoaded: true,
      aiModels: [],
      maasModels: [],
      lastInput: '',
      setLastInput: jest.fn(),
      lsdStatus: null,
      lsdStatusLoaded: true,
      aiModelsLoaded: true,
      maasModelsLoaded: true,
      modelsError: undefined,
      lsdStatusError: undefined,
      aiModelsError: undefined,
      maasModelsError: undefined,
      nemoGuardrailsStatus: null,
      nemoGuardrailsStatusLoaded: true,
      nemoGuardrailsStatusError: undefined,
      refresh: jest.fn(),
    }),
  };
});

jest.mock('~/app/context/GenAiContext', () => {
  const { createContext } = require('react');
  return {
    GenAiContext: createContext({
      namespace: { name: 'test-ns' },
      apiState: { apiAvailable: true, api: {} },
      refreshAPIState: jest.fn(),
    }),
  };
});

jest.mock('~/app/utilities', () => ({
  isLlamaModelEnabled: jest.fn(() => true),
  URL_PREFIX: '/gen-ai',
}));

jest.mock('~/app/utilities/utils', () => ({
  getId: jest.fn(() => 'mock-compare-id'),
  getLlamaModelDisplayName: jest.fn((id: string) => id),
  splitLlamaModelId: jest.fn((id: string) => ({ providerId: 'p', id })),
  convertMaaSModelToAIModel: jest.fn((m: unknown) => m),
  isPlaygroundModelMatchForAIModel: jest.fn(() => true),
  isVisionModel: jest.fn(() => true),
  isMaasLlamaModelId: jest.fn(() => false),
}));

jest.mock('~/app/hooks/useWorkspaceCapabilities', () => ({
  __esModule: true,
  default: jest.fn(() => ({
    hasVisionModel: true,
    hasASRModel: true,
    capabilitiesReady: true,
    capabilitiesError: false,
  })),
}));

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
  fireFormTrackingEvent: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/concepts/dashboard/DashboardModalFooter', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({
      onSubmit,
      onCancel,
      submitLabel,
    }: {
      onSubmit: () => void;
      onCancel: () => void;
      submitLabel?: string;
    }) =>
      React.createElement(
        'div',
        { 'data-testid': 'modal-footer' },
        React.createElement(
          'button',
          { 'data-testid': 'modal-submit', onClick: onSubmit, type: 'button' },
          submitLabel || 'Submit',
        ),
        React.createElement(
          'button',
          { 'data-testid': 'modal-cancel', onClick: onCancel, type: 'button' },
          'Cancel',
        ),
      ),
  };
});

jest.mock('@patternfly/chatbot', () => {
  const React = require('react');
  return {
    Chatbot: ({ children }: { children: unknown }) => React.createElement('div', null, children),
    ChatbotContent: ({ children }: { children: unknown }) =>
      React.createElement('div', null, children),
    ChatbotDisplayMode: { embedded: 'embedded' },
    MessageBox: ({ children }: { children: unknown }) => React.createElement('div', null, children),
    ChatbotWelcomePrompt: () => React.createElement('div', null, 'Welcome'),
    FileDetailsLabel: (props: {
      fileName: string;
      isLoading?: boolean;
      onClose?: (e: unknown) => void;
      'data-testid'?: string;
      hasTruncation?: boolean;
    }) =>
      React.createElement(
        'div',
        { 'data-testid': props['data-testid'] || `file-label-${props.fileName}` },
        React.createElement('span', { 'data-testid': 'chip-file-name' }, props.fileName),
        props.isLoading
          ? React.createElement('span', { 'data-testid': 'chip-loading' }, 'Loading')
          : null,
        !props.isLoading && props.onClose
          ? React.createElement(
              'button',
              {
                'data-testid': 'chip-close',
                onClick: (e: unknown) => props.onClose!(e),
                type: 'button',
              },
              '×',
            )
          : null,
      ),
    MessageBar: (props: {
      onSendMessage: (msg: string) => void;
      isSendButtonDisabled: boolean;
      hasAttachButton: boolean;
      hasStopButton?: boolean;
      handleStopButton?: () => void;
      alwayShowSendButton?: boolean;
      value?: string;
      onChange?: (e: unknown, val: string) => void;
      attachMenuProps?: {
        isAttachMenuOpen: boolean;
        setIsAttachMenuOpen: (v: boolean) => void;
        attachMenuItems: unknown;
        onAttachMenuToggleClick: () => void;
      };
      'data-testid'?: string;
      buttonProps?: unknown;
    }) =>
      React.createElement(
        'div',
        {
          'data-testid': 'chatbot-message-bar',
          'data-always-show-send': props.alwayShowSendButton ? 'true' : 'false',
        },
        React.createElement(
          'button',
          {
            'data-testid': 'send-button',
            disabled: props.isSendButtonDisabled,
            onClick: () => props.onSendMessage('test msg'),
            type: 'button',
          },
          'Send',
        ),
        React.createElement(
          'button',
          {
            'data-testid': 'send-empty-button',
            disabled: props.isSendButtonDisabled,
            onClick: () => props.onSendMessage(''),
            type: 'button',
          },
          'Send Empty',
        ),
        props.onChange
          ? React.createElement(
              'button',
              {
                'data-testid': 'clear-message-button',
                onClick: () => props.onChange!(null, ''),
                type: 'button',
              },
              'Clear',
            )
          : null,
        props.hasAttachButton && props.attachMenuProps
          ? React.createElement(
              'button',
              {
                'data-testid': 'attach-toggle',
                onClick: props.attachMenuProps.onAttachMenuToggleClick,
                type: 'button',
              },
              'Attach',
            )
          : null,
        props.hasAttachButton && props.attachMenuProps?.isAttachMenuOpen
          ? React.createElement(
              'div',
              { 'data-testid': 'attach-menu' },
              props.attachMenuProps.attachMenuItems,
            )
          : null,
      ),
    ChatbotFootnote: () => null,
  };
});

jest.mock('@patternfly/react-core', () => {
  const React = require('react');
  const actual = jest.requireActual('@patternfly/react-core');
  return {
    ...actual,
    Modal: ({
      children,
      isOpen,
      'data-testid': testId,
    }: {
      children: unknown;
      isOpen?: boolean;
      'data-testid'?: string;
    }) =>
      isOpen ? React.createElement('div', { 'data-testid': testId || 'modal' }, children) : null,
    ModalHeader: ({ title }: { title: string }) => React.createElement('div', null, title),
    ModalBody: ({ children }: { children: unknown }) => React.createElement('div', null, children),
    ModalFooter: ({ children }: { children: unknown }) =>
      React.createElement('div', null, children),
    MenuItem: ({
      children,
      onClick,
      isDisabled,
    }: {
      children: string;
      onClick?: () => void;
      isDisabled?: boolean;
      icon?: unknown;
    }) => {
      const label = typeof children === 'string' ? children : 'item';
      return React.createElement(
        'button',
        {
          'data-testid': `menu-item-${label.replace(/\s+/g, '-').toLowerCase()}`,
          onClick: isDisabled ? undefined : onClick,
          disabled: isDisabled,
          type: 'button',
        },
        children,
      );
    },
    MenuList: ({ children }: { children: unknown }) => React.createElement('div', null, children),
  };
});

jest.mock('@patternfly/react-icons', () => {
  const React = require('react');
  return {
    OutlinedFileImageIcon: () => React.createElement('span'),
    VolumeUpIcon: () => React.createElement('span'),
    OutlinedFileAltIcon: () => React.createElement('span'),
  };
});

jest.mock('~/app/Chatbot/sourceUpload/ChatbotSourceSettingsModal', () => ({
  ChatbotSourceSettingsModal: () => null,
}));

jest.mock('~/app/Chatbot/components/ChatbotSettingsPanel', () => {
  const React = require('react');
  return {
    ChatbotSettingsPanel: () => React.createElement('div', { 'data-testid': 'settings-panel' }),
  };
});

jest.mock('~/app/Chatbot/components/ChatbotPaneHeader', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: () => React.createElement('div', { 'data-testid': 'pane-header' }),
  };
});

jest.mock('~/app/Chatbot/components/ViewCodeModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('~/app/Chatbot/components/ChatModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('~/app/Chatbot/ChatbotPane', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: ({ children }: { children: unknown }) => React.createElement('div', null, children),
  };
});

jest.mock('~/app/Chatbot/components/CloseChatCompareModal', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('~/app/Chatbot/ChatbotConfigInstance', () => {
  const React = require('react');
  return {
    ChatbotConfigInstance: () => React.createElement('div', { 'data-testid': 'config-instance' }),
  };
});

jest.mock('~/app/Chatbot/components/alerts/SourceUploadErrorAlert', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('~/app/Chatbot/components/alerts/SourceUploadSuccessAlert', () => ({
  __esModule: true,
  default: () => null,
}));

jest.mock('~/app/Chatbot/components/alerts/SourceDeleteSuccessAlert', () => ({
  __esModule: true,
  default: () => null,
}));

// Mock crypto.randomUUID
let uuidCounter = 0;
Object.defineProperty(globalThis, 'crypto', {
  value: {
    randomUUID: jest.fn(() => `uuid-${++uuidCounter}`),
  },
  writable: true,
});

// Mock URL.createObjectURL / revokeObjectURL (not available in JSDOM)
global.URL.createObjectURL = jest.fn(() => 'blob:mock-preview-url');
global.URL.revokeObjectURL = jest.fn();

// ───────────────────── Import after mocks ─────────────────────

import ChatbotPlayground from '~/app/Chatbot/ChatbotPlayground';
import { useChatbotConfigStore } from '~/app/Chatbot/store/useChatbotConfigStore';
import { DEFAULT_CONFIGURATION } from '~/app/Chatbot/store/types';
import { DEFAULT_CONFIG_ID } from '~/app/Chatbot/store';
import { ChatbotContext } from '~/app/context/ChatbotContext';

// Access the setLastInput mock from the mocked context default value
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockSetLastInput = (ChatbotContext as any)._currentValue.setLastInput as jest.Mock;

// ───────────────────── Helpers ─────────────────────

const renderPlayground = () =>
  render(
    <MemoryRouter initialEntries={['/gen-ai-studio/playground/test-ns']}>
      <ChatbotPlayground
        isViewCodeModalOpen={false}
        setIsViewCodeModalOpen={jest.fn()}
        isNewChatModalOpen={false}
        setIsNewChatModalOpen={jest.fn()}
      />
    </MemoryRouter>,
  );

const createFile = (name: string, type = 'text/plain', size = 100): File =>
  new File(['x'.repeat(size)], name, { type });

/**
 * Create a mock FileList from an array of Files.
 */
const createFileList = (files: File[]): FileList => {
  const list = {
    length: files.length,
    item: (i: number) => files[i] || null,
    *[Symbol.iterator]() {
      for (const f of files) {
        yield f;
      }
    },
  } as unknown as FileList;
  files.forEach((f, i) => {
    Object.defineProperty(list, i, { value: f, enumerable: true });
  });
  return list;
};

/**
 * Trigger document file upload by programmatically setting files on the hidden
 * input and firing a change event — mirrors what the browser does.
 */
const triggerDocumentUpload = async (files: File[]) => {
  const input = screen.getByTestId('document-file-input') as HTMLInputElement;
  Object.defineProperty(input, 'files', { value: createFileList(files), configurable: true });

  await act(async () => {
    fireEvent.change(input);
  });
};

// ───────────────────── Tests ─────────────────────

describe('ChatbotPlayground — document upload and messaging', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    uuidCounter = 0;
    mockFilesWithSettings = [];
    mockFileManagementFiles = [];

    act(() => {
      useChatbotConfigStore.setState({
        configurations: {
          [DEFAULT_CONFIG_ID]: {
            ...DEFAULT_CONFIGURATION,
            selectedModel: 'test-model',
          },
        },
        configIds: [DEFAULT_CONFIG_ID],
      });
    });
  });

  describe('handleAttach — document upload', () => {
    it('calls sourceManagement.handleSourceDrop with the files', async () => {
      renderPlayground();

      await triggerDocumentUpload([createFile('x.txt'), createFile('y.txt')]);

      expect(mockHandleSourceDrop).toHaveBeenCalledTimes(1);
      const [, filesArg] = mockHandleSourceDrop.mock.calls[0];
      expect(filesArg).toHaveLength(2);
      expect(filesArg[0].name).toBe('x.txt');
      expect(filesArg[1].name).toBe('y.txt');
    });

    it('shows error alert on handleSourceDrop failure', async () => {
      mockHandleSourceDrop.mockRejectedValueOnce(new Error('Upload API failed'));
      renderPlayground();

      await triggerDocumentUpload([createFile('fail.txt')]);

      await waitFor(() => {
        expect(mockOnShowErrorAlert).toHaveBeenCalledWith(
          expect.stringContaining('Upload API failed'),
          'File Upload Error',
        );
      });
    });
  });

  describe('default message injection and alwaysShowSendButton', () => {
    const triggerImageUpload = async () => {
      const { uploadMediaFile } = require('~/app/services/llamaStackService') as {
        uploadMediaFile: jest.Mock;
      };
      uploadMediaFile.mockReturnValue({
        promise: Promise.resolve({ data: { id: 'img-file-123' } }),
        xhr: { abort: jest.fn() },
      });

      const input = screen.getByTestId('vision-file-input') as HTMLInputElement;
      const imageFile = new File(['pixels'], 'photo.png', { type: 'image/png' });
      Object.defineProperty(input, 'files', {
        value: createFileList([imageFile]),
        configurable: true,
      });

      await act(async () => {
        fireEvent.change(input);
      });

      // Wait for upload to complete and state to settle
      await waitFor(() => {
        expect(screen.getByTestId('chatbot-message-bar')).toHaveAttribute(
          'data-always-show-send',
          'true',
        );
      });
    };

    it('sets alwaysShowSendButton=true when image is uploaded', async () => {
      renderPlayground();
      await triggerImageUpload();

      expect(screen.getByTestId('chatbot-message-bar')).toHaveAttribute(
        'data-always-show-send',
        'true',
      );
    });

    it('injects "Describe the image" when send is clicked with empty text and image only', async () => {
      renderPlayground();
      await triggerImageUpload();

      await act(async () => {
        fireEvent.click(screen.getByTestId('send-empty-button'));
      });

      expect(mockSetLastInput).toHaveBeenCalledWith('Describe the image');
    });

    it('does NOT inject default message when user typed text', async () => {
      renderPlayground();
      await triggerImageUpload();

      await act(async () => {
        fireEvent.click(screen.getByTestId('send-button'));
      });

      expect(mockSetLastInput).toHaveBeenCalledWith('test msg');
    });

    it('alwaysShowSendButton is false when no attachments', () => {
      renderPlayground();
      expect(screen.getByTestId('chatbot-message-bar')).toHaveAttribute(
        'data-always-show-send',
        'false',
      );
    });

    it('send handler runs successfully with no attachments', async () => {
      renderPlayground();

      await waitFor(() => {
        expect(screen.getByTestId('send-button')).not.toBeDisabled();
      });

      // Click should not throw — verifies the full send handler executes without error
      await act(async () => {
        fireEvent.click(screen.getByTestId('send-button'));
      });

      expect(screen.getByTestId('send-button')).toBeInTheDocument();
    });
  });

  describe('replace media modal', () => {
    const setupImageUpload = () => {
      const { uploadMediaFile } = require('~/app/services/llamaStackService') as {
        uploadMediaFile: jest.Mock;
      };
      uploadMediaFile.mockReturnValue({
        promise: Promise.resolve({ data: { id: 'img-file-1' } }),
        xhr: { abort: jest.fn() },
      });
      return uploadMediaFile;
    };

    const triggerImageFileChange = async (fileName = 'photo.png') => {
      const input = screen.getByTestId('vision-file-input') as HTMLInputElement;
      const imageFile = new File(['pixels'], fileName, { type: 'image/png' });
      Object.defineProperty(input, 'files', {
        value: createFileList([imageFile]),
        configurable: true,
      });
      await act(async () => {
        fireEvent.change(input);
      });
    };

    it('opens replace-media modal when uploading a second image before sending', async () => {
      const uploadMediaFile = setupImageUpload();
      renderPlayground();

      // First upload
      await triggerImageFileChange('first.png');
      await waitFor(() => {
        expect(uploadMediaFile).toHaveBeenCalledTimes(1);
      });

      // Second upload triggers the modal instead of uploading
      await triggerImageFileChange('second.png');
      expect(screen.getByTestId('replace-media-modal')).toBeInTheDocument();
      expect(uploadMediaFile).toHaveBeenCalledTimes(1);
    });

    it('confirm replaces image and revokes old blob', async () => {
      const uploadMediaFile = setupImageUpload();
      renderPlayground();

      await triggerImageFileChange('first.png');
      await waitFor(() => {
        expect(uploadMediaFile).toHaveBeenCalledTimes(1);
      });

      // Trigger replace modal
      await triggerImageFileChange('second.png');
      expect(screen.getByTestId('replace-media-modal')).toBeInTheDocument();

      // Click Replace (submit)
      await act(async () => {
        fireEvent.click(screen.getByTestId('modal-submit'));
      });

      // Modal closes and new upload starts
      expect(screen.queryByTestId('replace-media-modal')).not.toBeInTheDocument();
      expect(global.URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-preview-url');
      await waitFor(() => {
        expect(uploadMediaFile).toHaveBeenCalledTimes(2);
      });
    });

    it('cancel closes modal without uploading', async () => {
      const uploadMediaFile = setupImageUpload();
      renderPlayground();

      await triggerImageFileChange('first.png');
      await waitFor(() => {
        expect(uploadMediaFile).toHaveBeenCalledTimes(1);
      });

      // Trigger replace modal
      await triggerImageFileChange('second.png');
      expect(screen.getByTestId('replace-media-modal')).toBeInTheDocument();

      // Click Cancel
      await act(async () => {
        fireEvent.click(screen.getByTestId('modal-cancel'));
      });

      // Modal closes, no new upload
      expect(screen.queryByTestId('replace-media-modal')).not.toBeInTheDocument();
      expect(uploadMediaFile).toHaveBeenCalledTimes(1);
    });
  });
});

describe('ChatbotPlayground — audio transcription', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    uuidCounter = 0;
    mockFilesWithSettings = [];
    mockFileManagementFiles = [];

    act(() => {
      useChatbotConfigStore.setState({
        configurations: {
          [DEFAULT_CONFIG_ID]: {
            ...DEFAULT_CONFIGURATION,
            selectedModel: 'test-model',
          },
        },
        configIds: [DEFAULT_CONFIG_ID],
      });
    });
  });

  const enableAsrAndRender = () => {
    renderPlayground();
    act(() => {
      useChatbotConfigStore.getState().updateSelectedAsrModel(DEFAULT_CONFIG_ID, 'whisper-model');
      useChatbotConfigStore.getState().updateAsrModelEnabled(DEFAULT_CONFIG_ID, true);
    });
  };

  it('renders audio file input', () => {
    renderPlayground();
    expect(screen.getByTestId('audio-file-input')).toBeInTheDocument();
  });

  it('audio upload triggers uploadMediaFile with audio type', async () => {
    const { uploadMediaFile } = require('~/app/services/llamaStackService');
    uploadMediaFile.mockReturnValue({
      promise: new Promise(() => {
        /* never resolves */
      }),
      xhr: { abort: jest.fn() },
    });

    enableAsrAndRender();

    const audioInput = screen.getByTestId('audio-file-input') as HTMLInputElement;
    const file = new File(['audio-data'], 'test.wav', { type: 'audio/wav' });

    await act(async () => {
      fireEvent.change(audioInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(uploadMediaFile).toHaveBeenCalledWith(
        expect.stringContaining('namespace=test-ns'),
        file,
        'audio',
        expect.any(Function),
      );
    });
  });

  it('per-message modal shows when trying to attach second audio', async () => {
    const { uploadMediaFile } = require('~/app/services/llamaStackService');
    uploadMediaFile.mockReturnValue({
      promise: new Promise(() => {
        /* never resolves */
      }),
      xhr: { abort: jest.fn() },
    });

    enableAsrAndRender();

    const audioInput = screen.getByTestId('audio-file-input') as HTMLInputElement;
    const file1 = new File(['audio-data'], 'first.wav', { type: 'audio/wav' });

    await act(async () => {
      fireEvent.change(audioInput, { target: { files: [file1] } });
    });

    const file2 = new File(['audio-data'], 'second.wav', { type: 'audio/wav' });
    await act(async () => {
      fireEvent.change(audioInput, { target: { files: [file2] } });
    });

    expect(screen.getByTestId('audio-per-message-modal')).toBeInTheDocument();
  });

  it('send resets hasAudioInCurrentMessage allowing new audio', async () => {
    const { uploadMediaFile, transcribeAudio } = require('~/app/services/llamaStackService');
    uploadMediaFile.mockReturnValue({
      promise: Promise.resolve({ data: { id: 'file-123' } }),
      xhr: { abort: jest.fn() },
    });
    transcribeAudio.mockResolvedValue({ text: 'Hello world' });

    enableAsrAndRender();

    const audioInput = screen.getByTestId('audio-file-input') as HTMLInputElement;
    const file = new File(['audio-data'], 'test.wav', { type: 'audio/wav' });

    await act(async () => {
      fireEvent.change(audioInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(transcribeAudio).toHaveBeenCalled();
    });

    // Send the message
    await act(async () => {
      fireEvent.click(screen.getByTestId('send-button'));
    });

    // Now a new audio upload should work (no per-message modal)
    const file2 = new File(['audio-data'], 'second.wav', { type: 'audio/wav' });
    await act(async () => {
      fireEvent.change(audioInput, { target: { files: [file2] } });
    });

    expect(screen.queryByTestId('audio-per-message-modal')).not.toBeInTheDocument();
  });

  it('clearing transcribed text resets hasAudioInCurrentMessage allowing new audio', async () => {
    const { uploadMediaFile, transcribeAudio } = require('~/app/services/llamaStackService');
    uploadMediaFile.mockReturnValue({
      promise: Promise.resolve({ data: { id: 'file-123' } }),
      xhr: { abort: jest.fn() },
    });
    transcribeAudio.mockResolvedValue({ text: 'Hello world' });

    enableAsrAndRender();

    const audioInput = screen.getByTestId('audio-file-input') as HTMLInputElement;
    const file = new File(['audio-data'], 'test.wav', { type: 'audio/wav' });

    await act(async () => {
      fireEvent.change(audioInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(transcribeAudio).toHaveBeenCalled();
    });

    // Clear the transcribed text (simulates user selecting all + deleting)
    await act(async () => {
      fireEvent.click(screen.getByTestId('clear-message-button'));
    });

    // Now a new audio upload should work (no per-message modal)
    const file2 = new File(['audio-data'], 'second.wav', { type: 'audio/wav' });
    await act(async () => {
      fireEvent.change(audioInput, { target: { files: [file2] } });
    });

    expect(screen.queryByTestId('audio-per-message-modal')).not.toBeInTheDocument();
  });

  it('namespace is included in the audio transcription API URL', async () => {
    const { uploadMediaFile, transcribeAudio } = require('~/app/services/llamaStackService');
    uploadMediaFile.mockReturnValue({
      promise: Promise.resolve({ data: { id: 'file-123' } }),
      xhr: { abort: jest.fn() },
    });
    transcribeAudio.mockResolvedValue({ text: 'Hello' });

    enableAsrAndRender();

    const audioInput = screen.getByTestId('audio-file-input') as HTMLInputElement;
    const file = new File(['audio-data'], 'test.wav', { type: 'audio/wav' });

    await act(async () => {
      fireEvent.change(audioInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(transcribeAudio).toHaveBeenCalledWith(
        expect.stringContaining('namespace=test-ns'),
        'file-123',
        'whisper-model',
        expect.any(AbortSignal),
      );
    });
  });

  it('clearAllMessagesRef aborts in-flight audio upload', async () => {
    const { uploadMediaFile } = require('~/app/services/llamaStackService');
    const mockXhrAbort = jest.fn();
    uploadMediaFile.mockReturnValue({
      promise: new Promise(() => {
        /* never resolves */
      }),
      xhr: { abort: mockXhrAbort },
    });

    const clearAllMessagesRef = { current: null } as React.MutableRefObject<(() => void) | null>;

    render(
      <MemoryRouter initialEntries={['/gen-ai-studio/playground/test-ns']}>
        <ChatbotPlayground
          isViewCodeModalOpen={false}
          setIsViewCodeModalOpen={jest.fn()}
          isNewChatModalOpen={false}
          setIsNewChatModalOpen={jest.fn()}
          clearAllMessagesRef={clearAllMessagesRef}
        />
      </MemoryRouter>,
    );

    act(() => {
      useChatbotConfigStore.getState().updateSelectedAsrModel(DEFAULT_CONFIG_ID, 'whisper-model');
      useChatbotConfigStore.getState().updateAsrModelEnabled(DEFAULT_CONFIG_ID, true);
    });

    const audioInput = screen.getByTestId('audio-file-input') as HTMLInputElement;
    const file = new File(['audio-data'], 'test.wav', { type: 'audio/wav' });

    await act(async () => {
      fireEvent.change(audioInput, { target: { files: [file] } });
    });

    await waitFor(() => {
      expect(uploadMediaFile).toHaveBeenCalled();
    });

    // Invoke clearAllMessages (same as New Chat confirm)
    act(() => {
      clearAllMessagesRef.current?.();
    });

    expect(mockXhrAbort).toHaveBeenCalled();
  });
});
