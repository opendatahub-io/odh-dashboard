import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import * as PluginCore from '@odh-dashboard/plugin-core';
import { isAIAssetsTabExtension } from '~/odh/extension-points';
import { AIAssetsPage } from '~/app/AIAssets/AIAssetsPage';

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
          id: 'maasmodels',
          title: 'Models as a service',
          component: () => Promise.resolve({ default: () => <div>MaaS Tab</div> }),
          label: 'Developer Preview',
        },
        uid: 'maas-uid',
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

    expect(screen.getByText('Models as a service')).toBeInTheDocument();
    expect(screen.getByText('Developer Preview')).toBeInTheDocument();
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
});
