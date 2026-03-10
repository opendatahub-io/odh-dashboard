import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatbotSettingsPanel } from '~/app/Chatbot/components/ChatbotSettingsPanel';
import { UseSourceManagementReturn } from '~/app/Chatbot/hooks/useSourceManagement';
import { UseFileManagementReturn } from '~/app/Chatbot/hooks/useFileManagement';
import { useChatbotConfigStore, DEFAULT_CONFIG_ID } from '~/app/Chatbot/store';

const SETTINGS_PANEL_WIDTH = 'chatbot-settings-panel-width-v2';
const DEFAULT_WIDTH = '500px';

const mockResizeEvent = new Event('click');

// Track DrawerPanelContent defaultSize (must be prefixed with 'mock' for Jest)
let mockDrawerPanelDefaultSize: string | undefined;
let mockDrawerHeadStyle: React.CSSProperties | undefined;
let mockDrawerBodyStyle: React.CSSProperties | undefined;

jest.mock('@patternfly/react-core', () => {
  const actual = jest.requireActual('@patternfly/react-core');
  return {
    ...actual,
    DrawerPanelContent: ({
      children,
      onResize,
      defaultSize,
    }: {
      children: React.ReactNode;
      onResize?: (event: Event, width: number, id: string) => void;
      defaultSize?: string;
    }) => {
      mockDrawerPanelDefaultSize = defaultSize;
      return (
        <div data-testid="mock-drawer-panel" data-default-size={defaultSize}>
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
      );
    },
    DrawerHead: ({
      children,
      style,
    }: {
      children: React.ReactNode;
      style?: React.CSSProperties;
    }) => {
      mockDrawerHeadStyle = style;
      return (
        <div data-testid="mock-drawer-head" style={style}>
          {children}
        </div>
      );
    },
    DrawerPanelBody: ({
      children,
      style,
    }: {
      children: React.ReactNode;
      style?: React.CSSProperties;
    }) => {
      mockDrawerBodyStyle = style;
      return (
        <div data-testid="mock-drawer-body" style={style}>
          {children}
        </div>
      );
    },
    Tabs: ({
      children,
      activeKey,
      ...domProps
    }: {
      children: React.ReactNode;
      activeKey?: string | number;
    }) => (
      <div data-testid="mock-tabs" data-active-key={activeKey} {...domProps}>
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
    mockDrawerPanelDefaultSize = undefined;
    mockDrawerHeadStyle = undefined;
    mockDrawerBodyStyle = undefined;
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

  it('should debounce Tabs remount when panel is resized', async () => {
    jest.useFakeTimers();
    const user = userEvent.setup({ delay: null });
    render(<ChatbotSettingsPanel {...defaultProps} onCloseClick={jest.fn()} />);

    // Verify tabs are rendered
    expect(screen.getByTestId('chatbot-settings-page-tabs')).toBeInTheDocument();

    // Resize panel to 200px
    const resize200Button = screen.getByTestId('trigger-resize-200');
    await user.click(resize200Button);

    // Verify the resize was processed
    expect(sessionStorage.getItem(SETTINGS_PANEL_WIDTH)).toBe('200px');

    // Fast-forward past debounce timeout
    await React.act(async () => {
      jest.advanceTimersByTime(300);
    });

    // Tabs should still be rendered (remount happened internally)
    expect(screen.getByTestId('chatbot-settings-page-tabs')).toBeInTheDocument();

    // Resize again to 250px
    const resize250Button = screen.getByTestId('trigger-resize-250');
    await user.click(resize250Button);

    // Verify the second resize was processed
    expect(sessionStorage.getItem(SETTINGS_PANEL_WIDTH)).toBe('250px');

    // Fast-forward past debounce timeout
    await React.act(async () => {
      jest.advanceTimersByTime(300);
    });

    // Tabs should still be rendered after second resize
    expect(screen.getByTestId('chatbot-settings-page-tabs')).toBeInTheDocument();

    jest.useRealTimers();
  });

  it('should auto-close when panel is resized below threshold without debouncing', async () => {
    const user = userEvent.setup();
    const mockOnCloseClick = jest.fn();
    render(<ChatbotSettingsPanel {...defaultProps} onCloseClick={mockOnCloseClick} />);

    // Verify tabs are initially rendered
    expect(screen.getByTestId('chatbot-settings-page-tabs')).toBeInTheDocument();

    // Resize below threshold (should auto-close, not resize)
    const resize50Button = screen.getByTestId('trigger-resize-50');
    await user.click(resize50Button);

    // Auto-close should have been triggered immediately
    expect(mockOnCloseClick).toHaveBeenCalledTimes(1);

    // Width should reset to default
    expect(sessionStorage.getItem(SETTINGS_PANEL_WIDTH)).toBe(DEFAULT_WIDTH);

    // Tabs should still be rendered (early return path worked correctly)
    expect(screen.getByTestId('chatbot-settings-page-tabs')).toBeInTheDocument();
  });

  it('should initialize with 500px default width when no stored width exists', () => {
    render(<ChatbotSettingsPanel {...defaultProps} />);

    // Should use default width
    expect(mockDrawerPanelDefaultSize).toBe(DEFAULT_WIDTH);
    expect(mockDrawerPanelDefaultSize).toBe('500px');
  });

  it('should use stored width from session storage if available', () => {
    const customWidth = '700px';
    sessionStorage.setItem(SETTINGS_PANEL_WIDTH, customWidth);

    render(<ChatbotSettingsPanel {...defaultProps} />);

    // Should use the stored width
    expect(mockDrawerPanelDefaultSize).toBe(customWidth);
  });

  it('should apply background color to DrawerHead and DrawerPanelBody when isOverlay is true', () => {
    render(<ChatbotSettingsPanel {...defaultProps} isOverlay />);

    const expectedBackgroundColor = 'var(--pf-t--global--background--color--primary--default)';

    // Both DrawerHead and DrawerPanelBody should have the background color
    expect(mockDrawerHeadStyle).toEqual({ backgroundColor: expectedBackgroundColor });
    expect(mockDrawerBodyStyle).toEqual({ backgroundColor: expectedBackgroundColor });
  });

  it('should not apply background color when isOverlay is false', () => {
    render(<ChatbotSettingsPanel {...defaultProps} isOverlay={false} />);

    // Style should be undefined when not in overlay mode
    expect(mockDrawerHeadStyle).toBeUndefined();
    expect(mockDrawerBodyStyle).toBeUndefined();
  });

  it('should not apply background color when isOverlay is not provided', () => {
    render(<ChatbotSettingsPanel {...defaultProps} />);

    // Style should be undefined when isOverlay defaults to false
    expect(mockDrawerHeadStyle).toBeUndefined();
    expect(mockDrawerBodyStyle).toBeUndefined();
  });

  it('should use default width of 500px even when isOverlay is true', () => {
    render(<ChatbotSettingsPanel {...defaultProps} isOverlay />);

    // Should still use the default width, overlay only affects background color
    expect(mockDrawerPanelDefaultSize).toBe(DEFAULT_WIDTH);
    expect(mockDrawerPanelDefaultSize).toBe('500px');

    // And should have the overlay background color
    const expectedBackgroundColor = 'var(--pf-t--global--background--color--primary--default)';
    expect(mockDrawerHeadStyle).toEqual({ backgroundColor: expectedBackgroundColor });
    expect(mockDrawerBodyStyle).toEqual({ backgroundColor: expectedBackgroundColor });
  });

  it('should preserve stored width and apply overlay background when both are active', () => {
    const customWidth = '700px';
    sessionStorage.setItem(SETTINGS_PANEL_WIDTH, customWidth);

    render(<ChatbotSettingsPanel {...defaultProps} isOverlay />);

    // Should use stored width
    expect(mockDrawerPanelDefaultSize).toBe(customWidth);

    // And should have overlay background
    const expectedBackgroundColor = 'var(--pf-t--global--background--color--primary--default)';
    expect(mockDrawerHeadStyle).toEqual({ backgroundColor: expectedBackgroundColor });
    expect(mockDrawerBodyStyle).toEqual({ backgroundColor: expectedBackgroundColor });
  });
});
