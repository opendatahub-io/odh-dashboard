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

// Track DrawerPanelContent defaultSize (must be prefixed with 'mock' for Jest)
let mockDrawerPanelDefaultSize: string | undefined;
let mockDrawerPanelStyle: React.CSSProperties | undefined;
let mockDrawerHeadStyle: React.CSSProperties | undefined;
let mockDrawerBodyStyle: React.CSSProperties | undefined;
let mockTabsMountCount = 0;

// Component to track Tabs mounts - must be outside jest.mock to use React hooks
const TabsMountTracker: React.FC<{
  children: React.ReactNode;
  activeKey?: string | number;
  role?: string;
  [key: string]: unknown;
}> = ({ children, activeKey, role, ...props }) => {
  const mountedRef = React.useRef(false);

  React.useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      mockTabsMountCount += 1;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div data-testid="mock-tabs" data-active-key={activeKey} role={role} {...props}>
      {children}
    </div>
  );
};

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
    Tabs: ({
      children,
      activeKey,
      role,
      ...domProps
    }: {
      children: React.ReactNode;
      activeKey?: string | number;
      onSelect?: (event: unknown, key: string | number) => void;
      role?: string;
      'aria-label'?: string;
      'data-testid'?: string;
    }) => (
      <TabsMountTracker activeKey={activeKey} role={role} {...domProps}>
        {children}
      </TabsMountTracker>
    ),
  };
});

jest.mock('~/app/Chatbot/hooks/useGuardrailsEnabled', () => ({
  __esModule: true,
  default: jest.fn(() => false),
}));

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
    mockTabsMountCount = 0;
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

    // Verify tabs are rendered and track initial mount count
    expect(screen.getByTestId('chatbot-settings-page-tabs')).toBeInTheDocument();
    const initialMountCount = mockTabsMountCount;
    expect(initialMountCount).toBe(1);

    // Resize panel to 200px
    const resize200Button = screen.getByTestId('trigger-resize-200');
    await user.click(resize200Button);

    // Verify the resize was processed
    expect(sessionStorage.getItem(SETTINGS_PANEL_WIDTH)).toBe('200px');

    // Before debounce timeout, Tabs should not have remounted yet (tabsKey not incremented)
    expect(mockTabsMountCount).toBe(initialMountCount);

    // Fast-forward past debounce timeout (300ms)
    await React.act(async () => {
      jest.advanceTimersByTime(300);
    });

    // Tabs should have remounted after debounce (tabsKey incremented)
    expect(mockTabsMountCount).toBe(initialMountCount + 1);
    expect(screen.getByTestId('chatbot-settings-page-tabs')).toBeInTheDocument();

    // Resize again to 250px
    const resize250Button = screen.getByTestId('trigger-resize-250');
    await user.click(resize250Button);

    // Verify the second resize was processed
    expect(sessionStorage.getItem(SETTINGS_PANEL_WIDTH)).toBe('250px');

    // Mount count should stay the same before debounce
    const mountCountAfterFirstDebounce = mockTabsMountCount;
    expect(mountCountAfterFirstDebounce).toBe(initialMountCount + 1);

    // Fast-forward past debounce timeout again
    await React.act(async () => {
      jest.advanceTimersByTime(300);
    });

    // Tabs should have remounted again (tabsKey incremented)
    expect(mockTabsMountCount).toBe(initialMountCount + 2);
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
    expect(mockDrawerPanelStyle).toEqual({ backgroundColor: expectedBackgroundColor });

    // DrawerHead and DrawerPanelBody should not have styles
    expect(mockDrawerHeadStyle).toBeUndefined();
    expect(mockDrawerBodyStyle).toBeUndefined();
  });

  it('should not apply background color when isOverlay is false', () => {
    render(<ChatbotSettingsPanel {...defaultProps} isOverlay={false} />);

    // DrawerPanelContent should not have style
    expect(mockDrawerPanelStyle).toBeUndefined();

    // DrawerHead and DrawerPanelBody should not have styles
    expect(mockDrawerHeadStyle).toBeUndefined();
    expect(mockDrawerBodyStyle).toBeUndefined();
  });

  it('should not apply background color when isOverlay is not provided', () => {
    render(<ChatbotSettingsPanel {...defaultProps} />);

    // DrawerPanelContent should not have style when isOverlay defaults to false
    expect(mockDrawerPanelStyle).toBeUndefined();

    // DrawerHead and DrawerPanelBody should not have styles
    expect(mockDrawerHeadStyle).toBeUndefined();
    expect(mockDrawerBodyStyle).toBeUndefined();
  });

  it('should use default width of 550px even when isOverlay is true', () => {
    render(<ChatbotSettingsPanel {...defaultProps} isOverlay />);

    // Should still use the default width, overlay only affects background color
    expect(mockDrawerPanelDefaultSize).toBe(DEFAULT_WIDTH);

    // And should have the overlay background color on DrawerPanelContent
    const expectedBackgroundColor = 'var(--pf-t--global--background--color--primary--default)';
    expect(mockDrawerPanelStyle).toEqual({ backgroundColor: expectedBackgroundColor });
  });

  it('should preserve stored width and apply overlay background when both are active', () => {
    const customWidth = '700px';
    sessionStorage.setItem(SETTINGS_PANEL_WIDTH, customWidth);

    render(<ChatbotSettingsPanel {...defaultProps} isOverlay />);

    // Should use stored width
    expect(mockDrawerPanelDefaultSize).toBe(customWidth);

    // And should have overlay background on DrawerPanelContent
    const expectedBackgroundColor = 'var(--pf-t--global--background--color--primary--default)';
    expect(mockDrawerPanelStyle).toEqual({ backgroundColor: expectedBackgroundColor });
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
      const singleTabs = singleContainer.querySelector(
        '[data-testid="chatbot-settings-page-tabs"]',
      );

      // Verify structure
      expect(singleHead?.parentElement).toBe(singlePanel);
      expect(singleBody?.parentElement).toBe(singlePanel);
      expect(singleTabs).toBeInTheDocument();

      // Now render compare mode
      const { container: compareContainer } = render(
        <ChatbotSettingsPanel {...defaultProps} isOverlay />,
      );

      const comparePanel = compareContainer.querySelector('[data-testid="mock-drawer-panel"]');
      const compareHead = comparePanel?.querySelector('[data-testid="mock-drawer-head"]');
      const compareBody = comparePanel?.querySelector('[data-testid="mock-drawer-body"]');
      const compareTabs = compareContainer.querySelector(
        '[data-testid="chatbot-settings-page-tabs"]',
      );

      // Verify structure is identical to single mode
      expect(compareHead?.parentElement).toBe(comparePanel);
      expect(compareBody?.parentElement).toBe(comparePanel);
      expect(compareTabs).toBeInTheDocument();
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

      // Compare mode: only backgroundColor in style
      rerender(<ChatbotSettingsPanel {...defaultProps} isOverlay />);
      const compareModeStyle = mockDrawerPanelStyle;
      expect(compareModeStyle).toEqual({
        backgroundColor: 'var(--pf-t--global--background--color--primary--default)',
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
      });
    });

    it('should not apply background to child components in overlay mode', () => {
      render(<ChatbotSettingsPanel {...defaultProps} isOverlay />);

      // Background is only on DrawerPanelContent, not on children
      expect(mockDrawerHeadStyle).toBeUndefined();
      expect(mockDrawerBodyStyle).toBeUndefined();
    });

    it('should only apply backgroundColor style without positioning styles', () => {
      render(<ChatbotSettingsPanel {...defaultProps} isOverlay />);

      // Only backgroundColor should be in the style, no positioning
      expect(mockDrawerPanelStyle).toEqual({
        backgroundColor: 'var(--pf-t--global--background--color--primary--default)',
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
      });
    });

    it('should default to non-overlay mode when isOverlay prop is not provided', () => {
      render(<ChatbotSettingsPanel {...defaultProps} />);

      expect(mockDrawerPanelStyle).toBeUndefined();
    });
  });
});
