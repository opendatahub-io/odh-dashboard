import * as React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import * as PluginCore from '@odh-dashboard/plugin-core';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { isAIAssetsTabExtension } from '~/odh/extension-points';
import { AIAssetsPage } from '~/app/AIAssets/AIAssetsPage';

// Mock tracking
jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
}));

// Mock the plugin core hooks
jest.mock('@odh-dashboard/plugin-core', () => ({
  useExtensions: jest.fn(),
  LazyCodeRefComponent: ({ component, ...props }: { component: unknown }) => (
    <div data-testid="lazy-component" data-component={String(component)} {...props} />
  ),
}));

// Mock GenAiCoreHeader
jest.mock('~/app/GenAiCoreHeader', () => ({
  __esModule: true,
  default: ({ title }: { title: string }) => <div data-testid="header">{title}</div>,
}));

// Mock ApplicationsPage
jest.mock('mod-arch-shared', () => ({
  ApplicationsPage: ({
    title,
    description,
    children,
  }: {
    title: React.ReactNode;
    description: string;
    children: React.ReactNode;
  }) => (
    <div data-testid="applications-page">
      {title}
      <div data-testid="description">{description}</div>
      {children}
    </div>
  ),
}));

const mockUseExtensions = jest.mocked(PluginCore.useExtensions);

describe('AIAssetsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render without tabs when no extensions are available', () => {
    mockUseExtensions.mockReturnValue([]);

    render(
      <MemoryRouter>
        <AIAssetsPage />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('applications-page')).toBeInTheDocument();
    expect(screen.getByTestId('description')).toHaveTextContent(
      'Browse endpoints for models and MCP servers that are available as AI assets.',
    );
  });

  it('should render tabs for all available extensions', () => {
    const mockExtensions = [
      {
        type: 'gen-ai.ai-assets/tab',
        properties: {
          id: 'models',
          title: 'Models',
          component: () => Promise.resolve({ default: () => <div>Models Tab</div> }),
        },
        uid: 'models-uid',
        pluginName: 'gen-ai',
        flags: {},
      },
      {
        type: 'gen-ai.ai-assets/tab',
        properties: {
          id: 'mcpservers',
          title: 'MCP servers',
          component: () => Promise.resolve({ default: () => <div>MCP Tab</div> }),
        },
        uid: 'mcp-uid',
        pluginName: 'gen-ai',
        flags: {},
      },
    ];

    mockUseExtensions.mockReturnValue(mockExtensions);

    render(
      <MemoryRouter>
        <AIAssetsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Models')).toBeInTheDocument();
    expect(screen.getByText('MCP servers')).toBeInTheDocument();
  });

  it('should render tab with label when provided', () => {
    const mockExtensions = [
      {
        type: 'gen-ai.ai-assets/tab',
        properties: {
          id: 'test-tab',
          title: 'Test Tab',
          component: () => Promise.resolve({ default: () => <div>Test Tab Content</div> }),
          label: 'Tech Preview',
        },
        uid: 'test-uid',
        pluginName: 'gen-ai',
        flags: {},
      },
    ];

    mockUseExtensions.mockReturnValue(mockExtensions);

    render(
      <MemoryRouter>
        <AIAssetsPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('Test Tab')).toBeInTheDocument();
    expect(screen.getByText('Tech Preview')).toBeInTheDocument();
  });

  it('should use correct extension type guard', () => {
    mockUseExtensions.mockReturnValue([]);

    render(
      <MemoryRouter>
        <AIAssetsPage />
      </MemoryRouter>,
    );

    expect(mockUseExtensions).toHaveBeenCalledWith(isAIAssetsTabExtension);
  });

  it('should set first tab as active by default', () => {
    const mockExtensions = [
      {
        type: 'gen-ai.ai-assets/tab',
        properties: {
          id: 'models',
          title: 'Models',
          component: () => Promise.resolve({ default: () => <div>Models Tab</div> }),
        },
        uid: 'models-uid',
        pluginName: 'gen-ai',
        flags: {},
      },
      {
        type: 'gen-ai.ai-assets/tab',
        properties: {
          id: 'mcpservers',
          title: 'MCP servers',
          component: () => Promise.resolve({ default: () => <div>MCP Tab</div> }),
        },
        uid: 'mcp-uid',
        pluginName: 'gen-ai',
        flags: {},
      },
    ];

    mockUseExtensions.mockReturnValue(mockExtensions);

    const { container } = render(
      <MemoryRouter>
        <AIAssetsPage />
      </MemoryRouter>,
    );

    // Check that tab content for the first tab is rendered
    const tabContent = container.querySelector('[id="models-tab-content"]');
    expect(tabContent).toBeInTheDocument();
  });

  describe('Event Tracking', () => {
    const mockExtensions = [
      {
        type: 'gen-ai.ai-assets/tab',
        properties: {
          id: 'models',
          title: 'Models',
          component: () => Promise.resolve({ default: () => <div>Models Tab</div> }),
        },
        uid: 'models-uid',
        pluginName: 'gen-ai',
        flags: {},
      },
      {
        type: 'gen-ai.ai-assets/tab',
        properties: {
          id: 'maas',
          title: 'MaaS Models',
          component: () => Promise.resolve({ default: () => <div>MaaS Tab</div> }),
        },
        uid: 'maas-uid',
        pluginName: 'gen-ai',
        flags: {},
      },
      {
        type: 'gen-ai.ai-assets/tab',
        properties: {
          id: 'mcpservers',
          title: 'MCP Servers',
          component: () => Promise.resolve({ default: () => <div>MCP Tab</div> }),
        },
        uid: 'mcp-uid',
        pluginName: 'gen-ai',
        flags: {},
      },
    ];

    beforeEach(() => {
      mockUseExtensions.mockReturnValue(mockExtensions);
      jest.clearAllMocks();
    });

    it('should fire tracking event when tab is changed', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <AIAssetsPage />
        </MemoryRouter>,
      );

      const maasTab = screen.getByRole('tab', { name: /MaaS Models/i });
      await user.click(maasTab);

      expect(fireMiscTrackingEvent).toHaveBeenCalledWith('AI Assets Tab Changed', {
        fromTab: 'models',
        toTab: 'maas',
      });
    });

    it('should track multiple tab changes correctly', async () => {
      const user = userEvent.setup();
      render(
        <MemoryRouter>
          <AIAssetsPage />
        </MemoryRouter>,
      );

      // Change to MaaS tab
      const maasTab = screen.getByRole('tab', { name: /MaaS Models/i });
      await user.click(maasTab);

      expect(fireMiscTrackingEvent).toHaveBeenCalledWith('AI Assets Tab Changed', {
        fromTab: 'models',
        toTab: 'maas',
      });

      // Change to MCP Servers tab
      const mcpTab = screen.getByRole('tab', { name: /MCP Servers/i });
      await user.click(mcpTab);

      expect(fireMiscTrackingEvent).toHaveBeenCalledWith('AI Assets Tab Changed', {
        fromTab: 'maas',
        toTab: 'mcpservers',
      });
    });

    it('should not fire tracking event on initial render', () => {
      render(
        <MemoryRouter>
          <AIAssetsPage />
        </MemoryRouter>,
      );

      expect(fireMiscTrackingEvent).not.toHaveBeenCalled();
    });
  });
});
