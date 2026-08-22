import * as React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatbotSettingsPanel } from '~/app/Chatbot/components/ChatbotSettingsPanel';
import { UseSourceManagementReturn } from '~/app/Chatbot/hooks/useSourceManagement';
import { UseFileManagementReturn } from '~/app/Chatbot/hooks/useFileManagement';
import { useChatbotConfigStore, DEFAULT_CONFIG_ID } from '~/app/Chatbot/store';
import useGuardrailsEnabled from '~/app/Chatbot/hooks/useGuardrailsEnabled';

const SETTINGS_PANEL_WIDTH = 'chatbot-settings-panel-width';
const DEFAULT_WIDTH = '550px';

const mockResizeEvent = new Event('click');

// Track DrawerPanelContent defaultSize (must be prefixed with 'mock' for Jest)
let mockDrawerPanelDefaultSize: string | undefined;
let mockDrawerPanelStyle: React.CSSProperties | undefined;
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
      style,
    }: {
      children: React.ReactNode;
      onResize?: (event: Event, width: number, id: string) => void;
      defaultSize?: string;
      style?: React.CSSProperties;
    }) => {
      mockDrawerPanelDefaultSize = defaultSize;
      mockDrawerPanelStyle = style;
      return (
        <div data-testid="mock-drawer-panel" data-default-size={defaultSize} style={style}>
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
  };
});

jest.mock('~/app/Chatbot/hooks/useGuardrailsEnabled', () => ({
  __esModule: true,
  default: jest.fn(() => false),
}));

const mockUseGuardrailsEnabled = jest.mocked(useGuardrailsEnabled);

jest.mock('@openshift/dynamic-plugin-sdk', () => ({
  useFeatureFlag: jest.fn(() => [false]),
}));

jest.mock('~/app/Chatbot/store/usePlaygroundStore', () => ({
  usePlaygroundStore: jest.fn(() => ({
    openModal: jest.fn(),
    closeModal: jest.fn(),
  })),
}));

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

  it('should only call onCloseClick once when resized below threshold multiple times in a row', async () => {
    const user = userEvent.setup();
    const mockOnCloseClick = jest.fn();
    render(<ChatbotSettingsPanel {...defaultProps} onCloseClick={mockOnCloseClick} />);

    const resize99Button = screen.getByTestId('trigger-resize-99');
    await user.click(resize99Button);
    expect(mockOnCloseClick).toHaveBeenCalledTimes(1);

    const resize50Button = screen.getByTestId('trigger-resize-50');
    await user.click(resize50Button);
    expect(mockOnCloseClick).toHaveBeenCalledTimes(1);
  });

  it('should call onCloseClick again after crossing back above the threshold and below it again', async () => {
    const user = userEvent.setup();
    const mockOnCloseClick = jest.fn();
    render(<ChatbotSettingsPanel {...defaultProps} onCloseClick={mockOnCloseClick} />);

    // Panel remounts (new `key`) on auto-close, so re-query the buttons fresh each time
    // rather than reusing a stale reference to the unmounted element.
    await user.click(screen.getByTestId('trigger-resize-50'));
    expect(mockOnCloseClick).toHaveBeenCalledTimes(1);

    await user.click(screen.getByTestId('trigger-resize-200'));
    expect(mockOnCloseClick).toHaveBeenCalledTimes(1);

    await user.click(screen.getByTestId('trigger-resize-50'));
    expect(mockOnCloseClick).toHaveBeenCalledTimes(2);
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

  it('should initialize with 550px default width when no stored width exists', () => {
    render(<ChatbotSettingsPanel {...defaultProps} />);

    // Should use default width
    expect(mockDrawerPanelDefaultSize).toBe(DEFAULT_WIDTH);
  });

  it('should use stored width from session storage if available', () => {
    const customWidth = '700px';
    sessionStorage.setItem(SETTINGS_PANEL_WIDTH, customWidth);

    render(<ChatbotSettingsPanel {...defaultProps} />);

    // Should use the stored width
    expect(mockDrawerPanelDefaultSize).toBe(customWidth);
  });

  it('should apply background color to DrawerPanelContent when isOverlay is true', () => {
    render(<ChatbotSettingsPanel {...defaultProps} isOverlay />);

    const expectedBackgroundColor = 'var(--pf-t--global--background--color--primary--default)';

    // DrawerPanelContent should have background color applied via style prop
    expect(mockDrawerPanelStyle).toEqual({
      backgroundColor: expectedBackgroundColor,
      overflow: 'hidden',
    });

    // DrawerHead and DrawerPanelBody should not have styles
    expect(mockDrawerHeadStyle).toBeUndefined();
    expect(mockDrawerBodyStyle).toEqual({
      flexGrow: 1,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    });
  });

  it('should not apply background color when isOverlay is false', () => {
    render(<ChatbotSettingsPanel {...defaultProps} isOverlay={false} />);

    // DrawerPanelContent should not have style
    expect(mockDrawerPanelStyle).toBeUndefined();

    // DrawerHead and DrawerPanelBody should not have styles
    expect(mockDrawerHeadStyle).toBeUndefined();
    expect(mockDrawerBodyStyle).toEqual({
      flexGrow: 1,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    });
  });

  it('should not apply background color when isOverlay is not provided', () => {
    render(<ChatbotSettingsPanel {...defaultProps} />);

    // DrawerPanelContent should not have style when isOverlay defaults to false
    expect(mockDrawerPanelStyle).toBeUndefined();

    // DrawerHead and DrawerPanelBody should not have styles
    expect(mockDrawerHeadStyle).toBeUndefined();
    expect(mockDrawerBodyStyle).toEqual({
      flexGrow: 1,
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
    });
  });

  it('should use default width of 550px even when isOverlay is true', () => {
    render(<ChatbotSettingsPanel {...defaultProps} isOverlay />);

    // Should still use the default width, overlay only affects background color
    expect(mockDrawerPanelDefaultSize).toBe(DEFAULT_WIDTH);

    // And should have the overlay background color on DrawerPanelContent
    const expectedBackgroundColor = 'var(--pf-t--global--background--color--primary--default)';
    expect(mockDrawerPanelStyle).toEqual({
      backgroundColor: expectedBackgroundColor,
      overflow: 'hidden',
    });
  });

  it('should preserve stored width and apply overlay background when both are active', () => {
    const customWidth = '700px';
    sessionStorage.setItem(SETTINGS_PANEL_WIDTH, customWidth);

    render(<ChatbotSettingsPanel {...defaultProps} isOverlay />);

    // Should use stored width
    expect(mockDrawerPanelDefaultSize).toBe(customWidth);

    // And should have overlay background on DrawerPanelContent
    const expectedBackgroundColor = 'var(--pf-t--global--background--color--primary--default)';
    expect(mockDrawerPanelStyle).toEqual({
      backgroundColor: expectedBackgroundColor,
      overflow: 'hidden',
    });
  });

  describe('Panel structure consistency between single and compare modes', () => {
    it('should have identical DOM structure in both single and compare mode', () => {
      const { container: singleContainer } = render(
        <ChatbotSettingsPanel {...defaultProps} isOverlay={false} />,
      );

      // Both should have DrawerPanelContent as direct parent
      const singlePanel = singleContainer.querySelector('[data-testid="mock-drawer-panel"]');

      // Both should have DrawerHead and DrawerPanelBody as direct children
      const singleHead = singlePanel?.querySelector('[data-testid="mock-drawer-head"]');
      const singleBody = singlePanel?.querySelector('[data-testid="mock-drawer-body"]');
      const singleToggleGroup = singleContainer.querySelector(
        '[data-testid="chatbot-settings-page-tabs"]',
      );

      // Verify structure
      expect(singleHead?.parentElement).toBe(singlePanel);
      expect(singleBody?.parentElement).toBe(singlePanel);
      expect(singleToggleGroup).toBeInTheDocument();

      // Now render compare mode
      const { container: compareContainer } = render(
        <ChatbotSettingsPanel {...defaultProps} isOverlay />,
      );

      const comparePanel = compareContainer.querySelector('[data-testid="mock-drawer-panel"]');
      const compareHead = comparePanel?.querySelector('[data-testid="mock-drawer-head"]');
      const compareBody = comparePanel?.querySelector('[data-testid="mock-drawer-body"]');
      const compareToggleGroup = compareContainer.querySelector(
        '[data-testid="chatbot-settings-page-tabs"]',
      );

      // Verify structure is identical to single mode
      expect(compareHead?.parentElement).toBe(comparePanel);
      expect(compareBody?.parentElement).toBe(comparePanel);
      expect(compareToggleGroup).toBeInTheDocument();
    });

    it('should render content directly in DrawerPanelContent for both modes', () => {
      const { container } = render(<ChatbotSettingsPanel {...defaultProps} isOverlay={false} />);

      const panel = container.querySelector('[data-testid="mock-drawer-panel"]');
      const drawerHead = panel?.querySelector('[data-testid="mock-drawer-head"]');
      const drawerBody = panel?.querySelector('[data-testid="mock-drawer-body"]');

      // Content should be direct children of panel
      expect(drawerHead?.parentElement).toBe(panel);
      expect(drawerBody?.parentElement).toBe(panel);
    });

    it('should have no wrapper divs between DrawerPanelContent and DrawerHead/DrawerPanelBody in either mode', () => {
      const { container: singleContainer } = render(
        <ChatbotSettingsPanel {...defaultProps} isOverlay={false} />,
      );
      const { container: compareContainer } = render(
        <ChatbotSettingsPanel {...defaultProps} isOverlay />,
      );

      // Single mode: DrawerHead should be direct child of DrawerPanelContent
      const singlePanel = singleContainer.querySelector('[data-testid="mock-drawer-panel"]');
      const singleHead = singleContainer.querySelector('[data-testid="mock-drawer-head"]');
      expect(singleHead?.parentElement).toBe(singlePanel);

      // Compare mode: DrawerHead should be direct child of DrawerPanelContent
      const comparePanel = compareContainer.querySelector('[data-testid="mock-drawer-panel"]');
      const compareHead = compareContainer.querySelector('[data-testid="mock-drawer-head"]');
      expect(compareHead?.parentElement).toBe(comparePanel);
    });

    it('should only differ in background color style on DrawerPanelContent between modes', () => {
      const { rerender } = render(<ChatbotSettingsPanel {...defaultProps} isOverlay={false} />);

      // Single mode: no style
      const singleModeStyle = mockDrawerPanelStyle;
      expect(singleModeStyle).toBeUndefined();

      // Compare mode: backgroundColor + overflow in style
      rerender(<ChatbotSettingsPanel {...defaultProps} isOverlay />);
      const compareModeStyle = mockDrawerPanelStyle;
      expect(compareModeStyle).toEqual({
        backgroundColor: 'var(--pf-t--global--background--color--primary--default)',
        overflow: 'hidden',
      });

      // No positioning or layout styles that could affect structure
      expect(compareModeStyle).not.toHaveProperty('position');
      expect(compareModeStyle).not.toHaveProperty('display');
      expect(compareModeStyle).not.toHaveProperty('flexDirection');
    });
  });

  describe('Width preservation with overlay mode', () => {
    beforeEach(() => {
      sessionStorage.clear();
      mockDrawerPanelDefaultSize = undefined;
      mockDrawerPanelStyle = undefined;
    });

    it('should only apply background color style to DrawerPanelContent in overlay mode', () => {
      const { rerender } = render(<ChatbotSettingsPanel {...defaultProps} isOverlay={false} />);
      expect(mockDrawerPanelStyle).toBeUndefined();

      rerender(<ChatbotSettingsPanel {...defaultProps} isOverlay />);
      expect(mockDrawerPanelStyle).toEqual({
        backgroundColor: 'var(--pf-t--global--background--color--primary--default)',
        overflow: 'hidden',
      });
    });

    it('should use default width of 550px when no stored width exists', () => {
      render(<ChatbotSettingsPanel {...defaultProps} isOverlay={false} />);
      expect(mockDrawerPanelDefaultSize).toBe('550px');

      sessionStorage.clear();
      mockDrawerPanelDefaultSize = undefined;

      render(<ChatbotSettingsPanel {...defaultProps} isOverlay />);
      expect(mockDrawerPanelDefaultSize).toBe('550px');
    });

    it('should preserve stored width regardless of overlay mode', () => {
      const customWidth = '650px';
      sessionStorage.setItem(SETTINGS_PANEL_WIDTH, customWidth);

      render(<ChatbotSettingsPanel {...defaultProps} isOverlay={false} />);
      expect(mockDrawerPanelDefaultSize).toBe(customWidth);

      sessionStorage.setItem(SETTINGS_PANEL_WIDTH, customWidth);
      mockDrawerPanelDefaultSize = undefined;

      render(<ChatbotSettingsPanel {...defaultProps} isOverlay />);
      expect(mockDrawerPanelDefaultSize).toBe(customWidth);
    });

    it('should maintain width after toggling overlay mode', () => {
      const { rerender } = render(<ChatbotSettingsPanel {...defaultProps} isOverlay={false} />);
      const initialWidth = mockDrawerPanelDefaultSize;

      rerender(<ChatbotSettingsPanel {...defaultProps} isOverlay />);
      expect(mockDrawerPanelDefaultSize).toBe(initialWidth);

      rerender(<ChatbotSettingsPanel {...defaultProps} isOverlay={false} />);
      expect(mockDrawerPanelDefaultSize).toBe(initialWidth);
    });
  });

  describe('Background color application for compare mode', () => {
    it('should apply correct PatternFly background color token to DrawerPanelContent in overlay mode', () => {
      render(<ChatbotSettingsPanel {...defaultProps} isOverlay />);

      expect(mockDrawerPanelStyle).toEqual({
        backgroundColor: 'var(--pf-t--global--background--color--primary--default)',
        overflow: 'hidden',
      });
    });

    it('should not apply background to child components in overlay mode', () => {
      render(<ChatbotSettingsPanel {...defaultProps} isOverlay />);

      // Background is only on DrawerPanelContent, not on children
      expect(mockDrawerHeadStyle).toBeUndefined();
      expect(mockDrawerBodyStyle).toEqual({
        flexGrow: 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      });
    });

    it('should only apply backgroundColor style without positioning styles', () => {
      render(<ChatbotSettingsPanel {...defaultProps} isOverlay />);

      expect(mockDrawerPanelStyle).toEqual({
        backgroundColor: 'var(--pf-t--global--background--color--primary--default)',
        overflow: 'hidden',
      });
      expect(mockDrawerPanelStyle).not.toHaveProperty('position');
      expect(mockDrawerPanelStyle).not.toHaveProperty('inset');
      expect(mockDrawerPanelStyle).not.toHaveProperty('display');
      expect(mockDrawerPanelStyle).not.toHaveProperty('flexDirection');
    });
  });

  describe('Conditional styling based on overlay mode', () => {
    it('should conditionally apply background style only when isOverlay is true', () => {
      const { rerender } = render(<ChatbotSettingsPanel {...defaultProps} isOverlay={false} />);

      expect(mockDrawerPanelStyle).toBeUndefined();

      rerender(<ChatbotSettingsPanel {...defaultProps} isOverlay />);

      expect(mockDrawerPanelStyle).toEqual({
        backgroundColor: 'var(--pf-t--global--background--color--primary--default)',
        overflow: 'hidden',
      });
    });

    it('should default to non-overlay mode when isOverlay prop is not provided', () => {
      render(<ChatbotSettingsPanel {...defaultProps} />);

      expect(mockDrawerPanelStyle).toBeUndefined();
    });
  });

  describe('Tab content visibility (display-none hiding approach)', () => {
    // ToggleGroupItem's data-testid lives on a non-interactive wrapper <div>; the actual
    // clickable element is the nested <button>, so we scope into it before clicking.
    const clickTabToggle = async (
      user: ReturnType<typeof userEvent.setup>,
      testId: string,
    ): Promise<void> => {
      await user.click(within(screen.getByTestId(testId)).getByRole('button'));
    };

    it('should show the Model tab content and hide all other tab contents by default', () => {
      render(<ChatbotSettingsPanel {...defaultProps} />);

      expect(screen.getByTestId('chatbot-settings-page-tab-content-model')).not.toHaveStyle({
        display: 'none',
      });
      expect(screen.getByTestId('chatbot-settings-page-tab-content-prompt')).toHaveStyle({
        display: 'none',
      });
      expect(screen.getByTestId('chatbot-settings-page-tab-content-knowledge')).toHaveStyle({
        display: 'none',
      });
      expect(screen.getByTestId('chatbot-settings-page-tab-content-mcp')).toHaveStyle({
        display: 'none',
      });
    });

    it('should keep all tab content mounted in the DOM regardless of active tab', () => {
      render(<ChatbotSettingsPanel {...defaultProps} />);

      // All tab content divs should be present in the DOM even though only one is visible,
      // preserving lifecycle state (data fetches, etc.) instead of unmounting inactive tabs.
      expect(screen.getByTestId('chatbot-settings-page-tab-content-model')).toBeInTheDocument();
      expect(screen.getByTestId('chatbot-settings-page-tab-content-prompt')).toBeInTheDocument();
      expect(screen.getByTestId('chatbot-settings-page-tab-content-knowledge')).toBeInTheDocument();
      expect(screen.getByTestId('chatbot-settings-page-tab-content-mcp')).toBeInTheDocument();

      // A field deep within the Prompt tab content should already be mounted, even while hidden.
      expect(screen.getByTestId('system-instructions-section')).toBeInTheDocument();
    });

    it('should switch visibility to the Prompt tab content when its toggle is selected', async () => {
      const user = userEvent.setup();
      render(<ChatbotSettingsPanel {...defaultProps} />);

      await clickTabToggle(user, 'chatbot-settings-page-tab-prompt');

      expect(screen.getByTestId('chatbot-settings-page-tab-content-prompt')).not.toHaveStyle({
        display: 'none',
      });
      expect(screen.getByTestId('chatbot-settings-page-tab-content-model')).toHaveStyle({
        display: 'none',
      });
      // Still mounted, just hidden
      expect(screen.getByTestId('chatbot-settings-page-tab-content-model')).toBeInTheDocument();
    });

    it('should switch visibility to the Knowledge tab content when its toggle is selected', async () => {
      const user = userEvent.setup();
      render(<ChatbotSettingsPanel {...defaultProps} />);

      await clickTabToggle(user, 'chatbot-settings-page-tab-knowledge');

      expect(screen.getByTestId('chatbot-settings-page-tab-content-knowledge')).not.toHaveStyle({
        display: 'none',
      });
      expect(screen.getByTestId('chatbot-settings-page-tab-content-model')).toHaveStyle({
        display: 'none',
      });
      expect(screen.getByTestId('chatbot-settings-page-tab-content-prompt')).toHaveStyle({
        display: 'none',
      });
      expect(screen.getByTestId('chatbot-settings-page-tab-content-mcp')).toHaveStyle({
        display: 'none',
      });
    });

    it('should switch visibility to the MCP tab content when its toggle is selected', async () => {
      const user = userEvent.setup();
      render(<ChatbotSettingsPanel {...defaultProps} />);

      await clickTabToggle(user, 'chatbot-settings-page-tab-mcp');

      expect(screen.getByTestId('chatbot-settings-page-tab-content-mcp')).not.toHaveStyle({
        display: 'none',
      });
      expect(screen.getByTestId('chatbot-settings-page-tab-content-model')).toHaveStyle({
        display: 'none',
      });
    });

    it('should restore Model tab visibility when switching back after visiting another tab', async () => {
      const user = userEvent.setup();
      render(<ChatbotSettingsPanel {...defaultProps} />);

      await clickTabToggle(user, 'chatbot-settings-page-tab-knowledge');
      expect(screen.getByTestId('chatbot-settings-page-tab-content-model')).toHaveStyle({
        display: 'none',
      });

      await clickTabToggle(user, 'chatbot-settings-page-tab-model');
      expect(screen.getByTestId('chatbot-settings-page-tab-content-model')).not.toHaveStyle({
        display: 'none',
      });
      expect(screen.getByTestId('chatbot-settings-page-tab-content-knowledge')).toHaveStyle({
        display: 'none',
      });
    });

    it('should respect defaultActiveTabKey for initial tab content visibility', () => {
      render(<ChatbotSettingsPanel {...defaultProps} defaultActiveTabKey={1} />);

      expect(screen.getByTestId('chatbot-settings-page-tab-content-prompt')).not.toHaveStyle({
        display: 'none',
      });
      expect(screen.getByTestId('chatbot-settings-page-tab-content-model')).toHaveStyle({
        display: 'none',
      });
    });

    it('should normalize a string defaultActiveTabKey to select the matching tab', () => {
      render(<ChatbotSettingsPanel {...defaultProps} defaultActiveTabKey="1" />);

      expect(screen.getByTestId('chatbot-settings-page-tab-content-prompt')).not.toHaveStyle({
        display: 'none',
      });
      expect(screen.getByTestId('chatbot-settings-page-tab-content-model')).toHaveStyle({
        display: 'none',
      });
    });

    it('should normalize a controlled string activeTabKey to select the matching tab', () => {
      render(<ChatbotSettingsPanel {...defaultProps} activeTabKey="2" />);

      expect(screen.getByTestId('chatbot-settings-page-tab-content-knowledge')).not.toHaveStyle({
        display: 'none',
      });
      expect(screen.getByTestId('chatbot-settings-page-tab-content-model')).toHaveStyle({
        display: 'none',
      });
    });

    describe('when guardrails feature flag is enabled', () => {
      beforeEach(() => {
        mockUseGuardrailsEnabled.mockReturnValue(true);
      });

      afterEach(() => {
        mockUseGuardrailsEnabled.mockReturnValue(false);
      });

      it('should render the Guardrails tab content hidden by default', () => {
        render(<ChatbotSettingsPanel {...defaultProps} />);

        expect(screen.getByTestId('chatbot-settings-page-tab-content-guardrails')).toHaveStyle({
          display: 'none',
        });
      });

      it('should show the Guardrails tab content when its toggle is selected', async () => {
        const user = userEvent.setup();
        render(<ChatbotSettingsPanel {...defaultProps} />);

        await clickTabToggle(user, 'chatbot-settings-page-tab-guardrails');

        expect(screen.getByTestId('chatbot-settings-page-tab-content-guardrails')).not.toHaveStyle({
          display: 'none',
        });
        expect(screen.getByTestId('chatbot-settings-page-tab-content-model')).toHaveStyle({
          display: 'none',
        });
      });
    });

    it('should not render the Guardrails tab content when the feature flag is disabled', () => {
      render(<ChatbotSettingsPanel {...defaultProps} />);

      expect(
        screen.queryByTestId('chatbot-settings-page-tab-content-guardrails'),
      ).not.toBeInTheDocument();
      expect(screen.queryByTestId('chatbot-settings-page-tab-guardrails')).not.toBeInTheDocument();
    });
  });
});
