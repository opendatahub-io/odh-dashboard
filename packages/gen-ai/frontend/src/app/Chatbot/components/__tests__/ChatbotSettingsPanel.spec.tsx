import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatbotSettingsPanel } from '~/app/Chatbot/components/ChatbotSettingsPanel';
import { UseSourceManagementReturn } from '~/app/Chatbot/hooks/useSourceManagement';
import { UseFileManagementReturn } from '~/app/Chatbot/hooks/useFileManagement';
import { useChatbotConfigStore, DEFAULT_CONFIG_ID } from '~/app/Chatbot/store';

const SETTINGS_PANEL_WIDTH = 'chatbot-settings-panel-width';
const DEFAULT_WIDTH = '550px';

const mockResizeEvent = new Event('click');

jest.mock('@patternfly/react-core', () => {
  const actual = jest.requireActual('@patternfly/react-core');
  return {
    ...actual,
    DrawerPanelContent: ({
      children,
      onResize,
    }: {
      children: React.ReactNode;
      onResize?: (event: Event, width: number, id: string) => void;
    }) => (
      <div data-testid="mock-drawer-panel">
        <button
          data-testid="trigger-resize-50"
          onClick={() => onResize?.(mockResizeEvent as unknown as MouseEvent, 50, '')}
          type="button"
        >
          Resize 50
        </button>
        <button
          data-testid="trigger-resize-99"
          onClick={() => onResize?.(mockResizeEvent as unknown as MouseEvent, 99, '')}
          type="button"
        >
          Resize 99
        </button>
        <button
          data-testid="trigger-resize-100"
          onClick={() => onResize?.(mockResizeEvent as unknown as MouseEvent, 100, '')}
          type="button"
        >
          Resize 100
        </button>
        <button
          data-testid="trigger-resize-200"
          onClick={() => onResize?.(mockResizeEvent as unknown as MouseEvent, 200, '')}
          type="button"
        >
          Resize 200
        </button>
        {children}
      </div>
    ),
  };
});

jest.mock('~/app/Chatbot/hooks/useGuardrailsEnabled', () => ({
  __esModule: true,
  default: jest.fn(() => false),
}));

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

describe('ChatbotSettingsPanel', () => {
  const defaultProps = {
    configId: DEFAULT_CONFIG_ID,
    alerts: {
      uploadSuccessAlert: undefined,
      deleteSuccessAlert: undefined,
      errorAlert: undefined,
    },
    sourceManagement: createMockSourceManagement(),
    fileManagement: createMockFileManagement(),
    mcpServers: [],
    mcpServersLoaded: true,
    mcpServerTokens: new Map(),
    onMcpServerTokensChange: jest.fn(),
    checkMcpServerStatus: jest.fn().mockResolvedValue({ status: 'ok', toolsCount: 0 }),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    sessionStorage.clear();
    useChatbotConfigStore.getState().resetConfiguration();
  });

  it('should call onCloseClick and reset sessionStorage when panel is resized below 100px', async () => {
    const user = userEvent.setup();
    const mockOnCloseClick = jest.fn();
    render(<ChatbotSettingsPanel {...defaultProps} onCloseClick={mockOnCloseClick} />);

    const resize50Button = screen.getByTestId('trigger-resize-50');
    await user.click(resize50Button);

    expect(mockOnCloseClick).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(SETTINGS_PANEL_WIDTH)).toBe(DEFAULT_WIDTH);
  });

  it('should call onCloseClick when panel is resized to 99px', async () => {
    const user = userEvent.setup();
    const mockOnCloseClick = jest.fn();
    render(<ChatbotSettingsPanel {...defaultProps} onCloseClick={mockOnCloseClick} />);

    const resize99Button = screen.getByTestId('trigger-resize-99');
    await user.click(resize99Button);

    expect(mockOnCloseClick).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(SETTINGS_PANEL_WIDTH)).toBe(DEFAULT_WIDTH);
  });

  it('should not call onCloseClick when panel is resized to 100px or more', async () => {
    const user = userEvent.setup();
    const mockOnCloseClick = jest.fn();
    render(<ChatbotSettingsPanel {...defaultProps} onCloseClick={mockOnCloseClick} />);

    const resize100Button = screen.getByTestId('trigger-resize-100');
    await user.click(resize100Button);

    expect(mockOnCloseClick).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(SETTINGS_PANEL_WIDTH)).toBe('100px');

    mockOnCloseClick.mockClear();
    const resize200Button = screen.getByTestId('trigger-resize-200');
    await user.click(resize200Button);

    expect(mockOnCloseClick).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(SETTINGS_PANEL_WIDTH)).toBe('200px');
  });

  it('should persist width to sessionStorage when resized above threshold', async () => {
    const user = userEvent.setup();
    render(<ChatbotSettingsPanel {...defaultProps} onCloseClick={jest.fn()} />);

    const resize200Button = screen.getByTestId('trigger-resize-200');
    await user.click(resize200Button);

    expect(sessionStorage.getItem(SETTINGS_PANEL_WIDTH)).toBe('200px');
  });

  it('should not throw when onCloseClick is not provided and panel is resized below threshold', async () => {
    const user = userEvent.setup();
    expect(() => {
      render(<ChatbotSettingsPanel {...defaultProps} />);
    }).not.toThrow();

    const resize50Button = screen.getByTestId('trigger-resize-50');
    await expect(user.click(resize50Button)).resolves.not.toThrow();
    expect(sessionStorage.getItem(SETTINGS_PANEL_WIDTH)).toBe(DEFAULT_WIDTH);
  });
});
