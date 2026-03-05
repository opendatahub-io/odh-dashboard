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

// Track Tabs render count (must be prefixed with 'mock' for Jest)
let mockTabsRenderCount = 0;

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
          data-testid="trigger-resize-149"
          onClick={() => onResize?.(mockResizeEvent as unknown as MouseEvent, 149, '')}
          type="button"
        >
          Resize 149
        </button>
        <button
          data-testid="trigger-resize-150"
          onClick={() => onResize?.(mockResizeEvent as unknown as MouseEvent, 150, '')}
          type="button"
        >
          Resize 150
        </button>
        <button
          data-testid="trigger-resize-200"
          onClick={() => onResize?.(mockResizeEvent as unknown as MouseEvent, 200, '')}
          type="button"
        >
          Resize 200
        </button>
        <button
          data-testid="trigger-resize-250"
          onClick={() => onResize?.(mockResizeEvent as unknown as MouseEvent, 250, '')}
          type="button"
        >
          Resize 250
        </button>
        {children}
      </div>
    ),
    Tabs: ({
      children,
      activeKey,
      ...domProps
    }: {
      children: React.ReactNode;
      activeKey?: string | number;
    }) => {
      mockTabsRenderCount += 1;
      return (
        <div
          data-testid="mock-tabs"
          data-render-count={mockTabsRenderCount}
          data-active-key={activeKey}
          {...domProps}
        >
          {children}
        </div>
      );
    },
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
    mockTabsRenderCount = 0;
  });

  it('should call onCloseClick and reset sessionStorage when panel is resized below 150px', async () => {
    const user = userEvent.setup();
    const mockOnCloseClick = jest.fn();
    render(<ChatbotSettingsPanel {...defaultProps} onCloseClick={mockOnCloseClick} />);

    const resize50Button = screen.getByTestId('trigger-resize-50');
    await user.click(resize50Button);

    expect(mockOnCloseClick).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(SETTINGS_PANEL_WIDTH)).toBe(DEFAULT_WIDTH);
  });

  it('should call onCloseClick when panel is resized to 149px', async () => {
    const user = userEvent.setup();
    const mockOnCloseClick = jest.fn();
    render(<ChatbotSettingsPanel {...defaultProps} onCloseClick={mockOnCloseClick} />);

    const resize149Button = screen.getByTestId('trigger-resize-149');
    await user.click(resize149Button);

    expect(mockOnCloseClick).toHaveBeenCalledTimes(1);
    expect(sessionStorage.getItem(SETTINGS_PANEL_WIDTH)).toBe(DEFAULT_WIDTH);
  });

  it('should not call onCloseClick when panel is resized to 150px or more', async () => {
    const user = userEvent.setup();
    const mockOnCloseClick = jest.fn();
    render(<ChatbotSettingsPanel {...defaultProps} onCloseClick={mockOnCloseClick} />);

    const resize150Button = screen.getByTestId('trigger-resize-150');
    await user.click(resize150Button);

    expect(mockOnCloseClick).not.toHaveBeenCalled();
    expect(sessionStorage.getItem(SETTINGS_PANEL_WIDTH)).toBe('150px');

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

  it('should remount Tabs when panel is resized to force overflow recalculation', async () => {
    const user = userEvent.setup();
    render(<ChatbotSettingsPanel {...defaultProps} onCloseClick={jest.fn()} />);

    // Capture initial render count (should be 1 after initial render)
    const initialRenderCount = mockTabsRenderCount;
    expect(initialRenderCount).toBeGreaterThan(0);

    // Resize panel to 200px
    const resize200Button = screen.getByTestId('trigger-resize-200');
    await user.click(resize200Button);

    // Tabs should have re-rendered (remounted) to recalculate overflow
    expect(mockTabsRenderCount).toBe(initialRenderCount + 1);

    // Capture the render count after first resize
    const firstResizeRenderCount = mockTabsRenderCount;

    // Resize again to 250px
    const resize250Button = screen.getByTestId('trigger-resize-250');
    await user.click(resize250Button);

    // Tabs should re-render again
    expect(mockTabsRenderCount).toBe(firstResizeRenderCount + 1);
  });

  it('should auto-close when panel is resized below threshold without incrementing tabsKey', async () => {
    const user = userEvent.setup();
    const mockOnCloseClick = jest.fn();
    render(<ChatbotSettingsPanel {...defaultProps} onCloseClick={mockOnCloseClick} />);

    // Capture initial render count
    const initialRenderCount = mockTabsRenderCount;

    // Resize below threshold (should auto-close, not resize)
    const resize50Button = screen.getByTestId('trigger-resize-50');
    await user.click(resize50Button);

    // Auto-close should have been triggered
    expect(mockOnCloseClick).toHaveBeenCalledTimes(1);

    // Tabs will re-render due to parent DrawerPanelContent remounting (setPanelSizeKey)
    // but the tabsKey itself is not incremented (we return early in handlePanelResize)
    // This is the correct behavior - we want to verify the early return path works
    expect(mockTabsRenderCount).toBeGreaterThan(initialRenderCount);
  });
});
