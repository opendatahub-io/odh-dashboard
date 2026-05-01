import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { UseSourceManagementReturn } from '~/app/Chatbot/hooks/useSourceManagement';
import { UseFileManagementReturn } from '~/app/Chatbot/hooks/useFileManagement';
import KnowledgeTabContent from '~/app/Chatbot/components/settingsPanelTabs/KnowledgeTabContent';
import { useChatbotConfigStore, DEFAULT_CONFIG_ID } from '~/app/Chatbot/store';
import useAiAssetVectorStoresEnabled from '~/app/hooks/useAiAssetVectorStoresEnabled';
import useFetchVectorStores from '~/app/hooks/useFetchVectorStores';

jest.mock('~/app/Chatbot/hooks/useDarkMode', () => ({
  __esModule: true,
  default: jest.fn(() => false),
}));

jest.mock('~/app/hooks/useAiAssetVectorStoresEnabled', () => ({
  __esModule: true,
  default: jest.fn(() => false),
}));

jest.mock('~/app/hooks/useFetchVectorStores', () => ({
  __esModule: true,
  default: jest.fn(() => [[], true]),
}));

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
}));

jest.mock('~/app/Chatbot/sourceUpload/ChatbotSourceUploadPanel', () => ({
  ChatbotSourceUploadPanel: ({
    uploadedFilesCount,
    maxFilesAllowed,
  }: {
    uploadedFilesCount: number;
    maxFilesAllowed: number;
  }) => (
    <div data-testid="chatbot-source-upload-panel">
      <span data-testid="uploaded-files-count">{uploadedFilesCount}</span>
      <span data-testid="max-files-allowed">{maxFilesAllowed}</span>
    </div>
  ),
}));

jest.mock('../../UploadedFilesList', () => ({
  __esModule: true,
  default: ({
    files,
    isLoading,
    isDeleting,
  }: {
    files: unknown[];
    isLoading: boolean;
    isDeleting: boolean;
  }) => (
    <div data-testid="uploaded-files-list">
      <span data-testid="files-count">{files.length}</span>
      <span data-testid="is-loading">{isLoading.toString()}</span>
      <span data-testid="is-deleting">{isDeleting.toString()}</span>
    </div>
  ),
}));

const mockFireMiscTrackingEvent = jest.mocked(fireMiscTrackingEvent);
const mockUseAiAssetVectorStoresEnabled = jest.mocked(useAiAssetVectorStoresEnabled);
const mockUseFetchVectorStores = jest.mocked(useFetchVectorStores);

describe('KnowledgeTabContent', () => {
  const createMockSourceManagement = (
    overrides?: Partial<UseSourceManagementReturn>,
  ): UseSourceManagementReturn => ({
    selectedSourceSettings: null,
    isSourceSettingsOpen: false,
    autoEnableRag: false,
    filesWithSettings: [],
    currentFileForSettings: null,
    pendingFiles: [],
    isUploading: false,
    uploadProgress: { current: 0, total: 0 },
    setAutoEnableRag: jest.fn(),
    handleSourceDrop: jest.fn(),
    removeUploadedSource: jest.fn(),
    handleSourceSettingsSubmit: jest.fn(),
    handleModalClose: jest.fn(),
    setIsSourceSettingsOpen: jest.fn(),
    setSelectedSourceSettings: jest.fn(),
    ...overrides,
  });

  const createMockFileManagement = (
    overrides?: Partial<UseFileManagementReturn>,
  ): UseFileManagementReturn => ({
    files: [],
    isLoading: false,
    isDeleting: false,
    error: null,
    deleteFileById: jest.fn(),
    refreshFiles: jest.fn(),
    currentVectorStoreId: null,
    ...overrides,
  });

  const defaultProps = {
    configId: DEFAULT_CONFIG_ID,
    sourceManagement: createMockSourceManagement(),
    fileManagement: createMockFileManagement(),
    alerts: {
      uploadSuccessAlert: undefined,
      deleteSuccessAlert: undefined,
      errorAlert: undefined,
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset the Zustand store to initial state with isRagEnabled: false
    useChatbotConfigStore.getState().resetConfiguration();
  });

  it('renders the RAG title', () => {
    render(<KnowledgeTabContent {...defaultProps} />);

    expect(screen.getByTestId('rag-section-title')).toHaveTextContent('RAG');
  });

  it('renders RAG toggle switch', () => {
    render(<KnowledgeTabContent {...defaultProps} />);

    const ragSwitch = screen.getByTestId('rag-toggle-switch');
    expect(ragSwitch).toBeInTheDocument();
  });

  it('renders RAG toggle as unchecked when isRagEnabled is false', () => {
    render(<KnowledgeTabContent {...defaultProps} />);

    const ragSwitch = screen.getByTestId('rag-toggle-switch');
    expect(ragSwitch).not.toBeChecked();
  });

  it('renders RAG toggle as checked when isRagEnabled is true', () => {
    // Set isRagEnabled to true in the store
    useChatbotConfigStore.getState().updateRagEnabled(DEFAULT_CONFIG_ID, true);

    render(<KnowledgeTabContent {...defaultProps} />);

    const ragSwitch = screen.getByTestId('rag-toggle-switch');
    expect(ragSwitch).toBeChecked();
  });

  it('calls updateRagEnabled and fires tracking event when RAG toggle is changed', async () => {
    const user = userEvent.setup();
    render(<KnowledgeTabContent {...defaultProps} />);

    const ragSwitch = screen.getByTestId('rag-toggle-switch');
    await user.click(ragSwitch);

    // Verify store was updated
    expect(useChatbotConfigStore.getState().getConfiguration(DEFAULT_CONFIG_ID)?.isRagEnabled).toBe(
      true,
    );
    expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith('Playground RAG Toggle Selected', {
      isRag: true,
      knowledgeSource: 'upload',
      compareMode: false,
      configID: 'default',
    });
  });

  it('fires tracking event with isRag false when disabling RAG', async () => {
    const user = userEvent.setup();
    // Set isRagEnabled to true first
    useChatbotConfigStore.getState().updateRagEnabled(DEFAULT_CONFIG_ID, true);

    render(<KnowledgeTabContent {...defaultProps} />);

    const ragSwitch = screen.getByTestId('rag-toggle-switch');
    await user.click(ragSwitch);

    // Verify store was updated
    expect(useChatbotConfigStore.getState().getConfiguration(DEFAULT_CONFIG_ID)?.isRagEnabled).toBe(
      false,
    );
    expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith('Playground RAG Toggle Selected', {
      isRag: false,
      knowledgeSource: 'upload',
      compareMode: false,
      configID: 'default',
    });
  });

  it('renders ChatbotSourceUploadPanel with correct props', () => {
    const props = {
      ...defaultProps,
      fileManagement: createMockFileManagement({
        files: [{ id: '1' }, { id: '2' }] as UseFileManagementReturn['files'],
      }),
    };
    render(<KnowledgeTabContent {...props} />);

    expect(screen.getByTestId('chatbot-source-upload-panel')).toBeInTheDocument();
    expect(screen.getByTestId('uploaded-files-count')).toHaveTextContent('2');
    expect(screen.getByTestId('max-files-allowed')).toHaveTextContent('10');
  });

  it('renders UploadedFilesList with correct props', () => {
    const props = {
      ...defaultProps,
      fileManagement: createMockFileManagement({
        files: [{ id: '1' }, { id: '2' }, { id: '3' }] as UseFileManagementReturn['files'],
        isLoading: true,
        isDeleting: true,
      }),
    };
    render(<KnowledgeTabContent {...props} />);

    expect(screen.getByTestId('uploaded-files-list')).toBeInTheDocument();
    expect(screen.getByTestId('files-count')).toHaveTextContent('3');
    expect(screen.getByTestId('is-loading')).toHaveTextContent('true');
    expect(screen.getByTestId('is-deleting')).toHaveTextContent('true');
  });

  it('displays upload success alert when provided', () => {
    const props = {
      ...defaultProps,
      alerts: {
        ...defaultProps.alerts,
        uploadSuccessAlert: <div data-testid="upload-success-alert">Upload Success</div>,
      },
    };
    render(<KnowledgeTabContent {...props} />);

    // The alert is passed to ChatbotSourceUploadPanel, which is mocked
    // So we verify it doesn't throw when provided
    expect(screen.getByTestId('chatbot-source-upload-panel')).toBeInTheDocument();
  });

  it('displays delete success alert when provided', () => {
    const props = {
      ...defaultProps,
      alerts: {
        ...defaultProps.alerts,
        deleteSuccessAlert: <div data-testid="delete-success-alert">Delete Success</div>,
      },
    };
    render(<KnowledgeTabContent {...props} />);

    // Delete success alert is rendered in AlertGroup
    expect(screen.getByTestId('delete-success-alert')).toBeInTheDocument();
  });

  it('displays error alert when provided', () => {
    const props = {
      ...defaultProps,
      alerts: {
        ...defaultProps.alerts,
        errorAlert: <div data-testid="error-alert">Error occurred</div>,
      },
    };
    render(<KnowledgeTabContent {...props} />);

    // The error alert is passed to ChatbotSourceUploadPanel, which is mocked
    expect(screen.getByTestId('chatbot-source-upload-panel')).toBeInTheDocument();
  });

  describe('Feature flag ON — Playground RAG Toggle Selected with knowledgeSource', () => {
    beforeEach(() => {
      mockUseAiAssetVectorStoresEnabled.mockReturnValue(true);
      mockUseFetchVectorStores.mockReturnValue([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [{ id: 'vs-1', name: 'Store', object: 'vector_store', metadata: {} }] as any,
        true,
        undefined,
        jest.fn(),
      ]);
    });

    it('fires tracking event with knowledgeSource upload when knowledgeMode is inline', async () => {
      const user = userEvent.setup();
      render(<KnowledgeTabContent {...defaultProps} />);

      await user.click(screen.getByTestId('rag-toggle-switch'));

      expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith('Playground RAG Toggle Selected', {
        isRag: true,
        knowledgeSource: 'upload',
        compareMode: false,
        configID: 'default',
      });
    });

    it('fires tracking event with knowledgeSource vectorstore when knowledgeMode is external', async () => {
      const user = userEvent.setup();
      useChatbotConfigStore.getState().updateKnowledgeMode(DEFAULT_CONFIG_ID, 'external');

      render(<KnowledgeTabContent {...defaultProps} />);

      await user.click(screen.getByTestId('rag-toggle-switch'));

      expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith('Playground RAG Toggle Selected', {
        isRag: true,
        knowledgeSource: 'vectorstore',
        compareMode: false,
        configID: 'default',
      });
    });
  });

  describe('Playground Knowledge Source Switched tracking', () => {
    beforeEach(() => {
      mockUseAiAssetVectorStoresEnabled.mockReturnValue(true);
      mockUseFetchVectorStores.mockReturnValue([
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [{ id: 'vs-1', name: 'Store', object: 'vector_store', metadata: {} }] as any,
        true,
        undefined,
        jest.fn(),
      ]);
    });

    it('fires tracking event when switching to external vector store mode', async () => {
      const user = userEvent.setup();
      render(<KnowledgeTabContent {...defaultProps} />);

      await user.click(screen.getByTestId('knowledge-mode-external-radio'));

      expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith(
        'Playground Knowledge Source Switched',
        {
          selectedSource: 'vectorstore',
          previousSource: 'upload',
          compareMode: false,
          configID: 'default',
        },
      );
    });

    it('fires tracking event when switching back to upload mode', async () => {
      const user = userEvent.setup();
      useChatbotConfigStore.getState().updateKnowledgeMode(DEFAULT_CONFIG_ID, 'external');

      render(<KnowledgeTabContent {...defaultProps} />);

      await user.click(screen.getByTestId('knowledge-mode-upload-radio'));

      expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith(
        'Playground Knowledge Source Switched',
        {
          selectedSource: 'upload',
          previousSource: 'vectorstore',
          compareMode: false,
          configID: 'default',
        },
      );
    });
  });

  describe('Playground Collection Dropdown Selected tracking', () => {
    const mockStores = [
      { id: 'vs-1', name: 'My Store', object: 'vector_store' as const, metadata: {} },
      { id: 'vs-2', name: 'Other Store', object: 'vector_store' as const, metadata: {} },
    ];

    beforeEach(() => {
      mockUseAiAssetVectorStoresEnabled.mockReturnValue(true);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mockUseFetchVectorStores.mockReturnValue([mockStores as any, true, undefined, jest.fn()]);
      useChatbotConfigStore.getState().updateKnowledgeMode(DEFAULT_CONFIG_ID, 'external');
    });

    it('fires tracking event when a vector store is selected from the dropdown', async () => {
      const user = userEvent.setup();
      render(<KnowledgeTabContent {...defaultProps} />);

      // Open the select
      await user.click(screen.getByTestId('external-vector-store-toggle'));

      // Click on an option
      await user.click(screen.getByRole('option', { name: 'My Store' }));

      expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith(
        'Playground Collection Dropdown Selected',
        {
          collectionName: 'My Store',
          collectionId: 'vs-1',
          compareMode: false,
          configID: 'default',
        },
      );
    });
  });
});
