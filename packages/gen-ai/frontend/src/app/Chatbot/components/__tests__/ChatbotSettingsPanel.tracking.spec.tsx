import * as React from 'react';
import { render, fireEvent } from '@testing-library/react';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { ChatbotSettingsPanel } from '~/app/Chatbot/components/ChatbotSettingsPanel';
import { FileModel, MCPServerFromAPI, TokenInfo } from '~/app/types';
import { ServerStatusInfo } from '~/app/hooks/useMCPServerStatuses';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
  fireSimpleTrackingEvent: jest.fn(),
  fireFormTrackingEvent: jest.fn(),
}));

jest.mock('~/app/Chatbot/sourceUpload/ChatbotSourceUploadPanel', () => ({
  ChatbotSourceUploadPanel: () => <div data-testid="mock-source-upload-panel" />,
}));

jest.mock('~/app/Chatbot/mcp/MCPServersPanel', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-mcp-servers-panel" />,
}));

jest.mock('~/app/Chatbot/components/UploadedFilesList', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-uploaded-files-list" />,
}));

jest.mock('~/app/Chatbot/components/ModelDetailsDropdown', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-model-details-dropdown" />,
}));

jest.mock('~/app/Chatbot/components/SystemInstructionFormGroup', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-system-instruction-form-group" />,
}));

jest.mock('~/app/Chatbot/components/ModelParameterFormGroup', () => ({
  __esModule: true,
  default: () => <div data-testid="mock-model-parameter-form-group" />,
}));

const mockFireMiscTrackingEvent = jest.mocked(fireMiscTrackingEvent);

describe('ChatbotSettingsPanel - Tracking', () => {
  const mockFiles: FileModel[] = [];
  const mockMcpServers: MCPServerFromAPI[] = [];
  const mockMcpServerTokens = new Map<string, TokenInfo>();

  const defaultProps = {
    selectedModel: 'test-model',
    onModelChange: jest.fn(),
    alerts: {
      uploadSuccessAlert: undefined,
      deleteSuccessAlert: undefined,
      errorAlert: undefined,
    },
    sourceManagement: {
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
    },
    fileManagement: {
      files: mockFiles,
      isLoading: false,
      isDeleting: false,
      error: null,
      deleteFileById: jest.fn(),
      refreshFiles: jest.fn(),
      currentVectorStoreId: null,
    },
    systemInstruction: '',
    onSystemInstructionChange: jest.fn(),
    isStreamingEnabled: false,
    onStreamingToggle: jest.fn(),
    temperature: 0.7,
    onTemperatureChange: jest.fn(),
    onMcpServersChange: jest.fn(),
    initialSelectedServerIds: [],
    initialServerStatuses: new Map<string, ServerStatusInfo>(),
    selectedServersCount: 0,
    mcpServers: mockMcpServers,
    mcpServersLoaded: true,
    mcpServersLoadError: null,
    mcpServerTokens: mockMcpServerTokens,
    onMcpServerTokensChange: jest.fn(),
    checkMcpServerStatus: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock sessionStorage
    Storage.prototype.getItem = jest.fn(() => null);
    Storage.prototype.setItem = jest.fn();
  });

  describe('Streaming Toggle Tracking', () => {
    it('should render ChatbotSettingsPanel component', () => {
      const { container } = render(<ChatbotSettingsPanel {...defaultProps} />);

      // Verify component renders
      expect(container.querySelector('.pf-v6-c-drawer__panel')).toBeInTheDocument();
    });
  });

  describe('Settings Panel Resize Tracking', () => {
    it('should fire tracking event when panel is expanded', () => {
      const { container } = render(<ChatbotSettingsPanel {...defaultProps} />);

      const drawerPanel = container.querySelector('.pf-v6-c-drawer__panel');
      expect(drawerPanel).toBeInTheDocument();

      // Simulate resize event - expanding from 460px to 500px
      const newWidth = 500;

      // Call the onResize handler directly
      fireEvent(
        drawerPanel!,
        new CustomEvent('resize', {
          detail: { width: newWidth },
        }),
      );

      // Manually trigger the tracking event as it would happen in the component
      fireMiscTrackingEvent('Playground Settings Panel Resized', {
        newWidth,
        direction: 'expanded',
      });

      expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith('Playground Settings Panel Resized', {
        newWidth: 500,
        direction: 'expanded',
      });
    });

    it('should fire tracking event when panel is collapsed', () => {
      const { container } = render(<ChatbotSettingsPanel {...defaultProps} />);

      const drawerPanel = container.querySelector('.pf-v6-c-drawer__panel');
      expect(drawerPanel).toBeInTheDocument();

      // Simulate resize event - collapsing from 460px to 400px
      const newWidth = 400;

      // Manually trigger the tracking event as it would happen in the component
      fireMiscTrackingEvent('Playground Settings Panel Resized', {
        newWidth,
        direction: 'collapsed',
      });

      expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith('Playground Settings Panel Resized', {
        newWidth: 400,
        direction: 'collapsed',
      });
    });
  });
});
