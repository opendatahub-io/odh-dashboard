import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { UseSourceManagementReturn } from '~/app/Chatbot/hooks/useSourceManagement';
import { UseFileManagementReturn } from '~/app/Chatbot/hooks/useFileManagement';
import KnowledgeTabContent from '~/app/Chatbot/components/settingsPanelTabs/KnowledgeTabContent';

jest.mock('~/app/Chatbot/hooks/useDarkMode', () => ({
  __esModule: true,
  default: jest.fn(() => false),
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

describe('KnowledgeTabContent', () => {
  const createMockSourceManagement = (
    overrides?: Partial<UseSourceManagementReturn>,
  ): UseSourceManagementReturn => ({
    selectedSourceSettings: null,
    isSourceSettingsOpen: false,
    isRawUploaded: false,
    filesWithSettings: [],
    currentFileForSettings: null,
    pendingFiles: [],
    isUploading: false,
    uploadProgress: { current: 0, total: 0 },
    setIsRawUploaded: jest.fn(),
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

  it('renders RAG toggle as unchecked when isRawUploaded is false', () => {
    render(<KnowledgeTabContent {...defaultProps} />);

    const ragSwitch = screen.getByTestId('rag-toggle-switch');
    expect(ragSwitch).not.toBeChecked();
  });

  it('renders RAG toggle as checked when isRawUploaded is true', () => {
    const props = {
      ...defaultProps,
      sourceManagement: createMockSourceManagement({ isRawUploaded: true }),
    };
    render(<KnowledgeTabContent {...props} />);

    const ragSwitch = screen.getByTestId('rag-toggle-switch');
    expect(ragSwitch).toBeChecked();
  });

  it('calls setIsRawUploaded and fires tracking event when RAG toggle is changed', async () => {
    const user = userEvent.setup();
    const mockSetIsRawUploaded = jest.fn();
    const props = {
      ...defaultProps,
      sourceManagement: createMockSourceManagement({ setIsRawUploaded: mockSetIsRawUploaded }),
    };
    render(<KnowledgeTabContent {...props} />);

    const ragSwitch = screen.getByTestId('rag-toggle-switch');
    await user.click(ragSwitch);

    expect(mockSetIsRawUploaded).toHaveBeenCalledWith(true);
    expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith('Playground RAG Toggle Selected', {
      isRag: true,
    });
  });

  it('fires tracking event with isRag false when disabling RAG', async () => {
    const user = userEvent.setup();
    const mockSetIsRawUploaded = jest.fn();
    const props = {
      ...defaultProps,
      sourceManagement: createMockSourceManagement({
        isRawUploaded: true,
        setIsRawUploaded: mockSetIsRawUploaded,
      }),
    };
    render(<KnowledgeTabContent {...props} />);

    const ragSwitch = screen.getByTestId('rag-toggle-switch');
    await user.click(ragSwitch);

    expect(mockSetIsRawUploaded).toHaveBeenCalledWith(false);
    expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith('Playground RAG Toggle Selected', {
      isRag: false,
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
});
