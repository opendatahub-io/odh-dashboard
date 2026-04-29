import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import * as PluginCore from '@odh-dashboard/plugin-core';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { isAIAssetsTabExtension } from '~/odh/extension-points';
import { AIAssetsPage } from '~/app/AIAssets/AIAssetsPage';

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
const mockFireMiscTrackingEvent = jest.mocked(fireMiscTrackingEvent);

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

  it('should activate the tab matching a valid :tab path param', () => {
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
          id: 'vectorstores',
          title: 'Vector stores',
          component: () => Promise.resolve({ default: () => <div>Vector Stores Tab</div> }),
        },
        uid: 'vectorstores-uid',
        pluginName: 'gen-ai',
        flags: {},
      },
    ];

    mockUseExtensions.mockReturnValue(mockExtensions);

    render(
      <MemoryRouter initialEntries={['/assets/my-project/vectorstores']}>
        <Routes>
          <Route path="/assets/:namespace" element={<AIAssetsPage />} />
          <Route path="/assets/:namespace/:tab" element={<AIAssetsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('ai-assets-tab-vectorstores')).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByTestId('ai-assets-tab-models')).toHaveAttribute('aria-selected', 'false');
  });

  it('should fall back to the first tab when :tab path param is invalid', () => {
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
          id: 'vectorstores',
          title: 'Vector stores',
          component: () => Promise.resolve({ default: () => <div>Vector Stores Tab</div> }),
        },
        uid: 'vectorstores-uid',
        pluginName: 'gen-ai',
        flags: {},
      },
    ];

    mockUseExtensions.mockReturnValue(mockExtensions);

    render(
      <MemoryRouter initialEntries={['/assets/my-project/not-a-real-tab']}>
        <Routes>
          <Route path="/assets/:namespace" element={<AIAssetsPage />} />
          <Route path="/assets/:namespace/:tab" element={<AIAssetsPage />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId('ai-assets-tab-models')).toHaveAttribute('aria-selected', 'true');
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

  describe('Available Endpoints Tab Switched tracking', () => {
    it('fires tracking event when a tab is clicked', () => {
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
            id: 'vectorstores',
            title: 'Vector stores',
            component: () => Promise.resolve({ default: () => <div>Vector Stores Tab</div> }),
          },
          uid: 'vectorstores-uid',
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

      fireEvent.click(screen.getByTestId('ai-assets-tab-vectorstores'));

      expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith('Available Endpoints Tab Switched', {
        source: 'vectorstores',
      });
    });

    it('fires tracking event with the correct tab id', () => {
      const mockExtensions = [
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
      ];

      mockUseExtensions.mockReturnValue(mockExtensions);

      render(
        <MemoryRouter>
          <AIAssetsPage />
        </MemoryRouter>,
      );

      fireEvent.click(screen.getByTestId('ai-assets-tab-models'));

      expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith('Available Endpoints Tab Switched', {
        source: 'models',
      });
    });
  });
});
