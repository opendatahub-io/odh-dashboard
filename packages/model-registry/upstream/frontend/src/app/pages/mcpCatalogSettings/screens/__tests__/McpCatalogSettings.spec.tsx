import '@testing-library/jest-dom';
import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import {
  McpCatalogSettingsContext,
  McpCatalogSettingsContextType,
} from '~/app/context/mcpCatalogSettings/McpCatalogSettingsContext';
import { McpCatalogSourceType } from '~/app/mcpServerCatalogTypes';
import McpCatalogSettings from '~/app/pages/mcpCatalogSettings/screens/McpCatalogSettings';

jest.mock('mod-arch-shared', () => ({
  ApplicationsPage: ({
    children,
    empty,
    emptyStatePage,
    loaded,
  }: {
    children: React.ReactNode;
    empty: boolean;
    emptyStatePage: React.ReactNode;
    loaded: boolean;
  }) => {
    if (!loaded) {
      return <div data-testid="loading">Loading...</div>;
    }
    if (empty) {
      return <div data-testid="empty-state">{emptyStatePage}</div>;
    }
    return <div data-testid="page-content">{children}</div>;
  },
  ProjectObjectType: { mcpCatalog: 'mcpCatalog' },
  TitleWithIcon: ({ title }: { title: string }) => <span>{title}</span>,
}));

jest.mock('../McpCatalogSourceConfigsTable', () => {
  const MockTable: React.FC<{
    onDeleteSource: (sourceId: string) => Promise<void>;
  }> = ({ onDeleteSource }) => (
    <div data-testid="mcp-source-configs-table">
      <button data-testid="delete-source-button" onClick={() => onDeleteSource('source-1')}>
        Delete
      </button>
    </div>
  );
  return { __esModule: true, default: MockTable };
});

const createMockContextValue = (
  overrides: Partial<McpCatalogSettingsContextType> = {},
): McpCatalogSettingsContextType => ({
  apiState: {
    apiAvailable: true,
    api: {
      getMcpCatalogSourceConfigs: jest.fn(),
      getMcpCatalogSourceConfig: jest.fn(),
      createMcpCatalogSourceConfig: jest.fn(),
      updateMcpCatalogSourceConfig: jest.fn(),
      deleteMcpCatalogSourceConfig: jest.fn().mockResolvedValue(undefined),
      previewMcpCatalogSource: jest.fn(),
    },
  },
  refreshAPIState: jest.fn(),
  mcpCatalogSourceConfigs: {
    catalogs: [
      {
        id: 'source-1',
        name: 'Test Source',
        type: McpCatalogSourceType.YAML,
        yaml: 'test: true',
        enabled: true,
      },
    ],
  },
  mcpCatalogSourceConfigsLoaded: true,
  mcpCatalogSourceConfigsLoadError: undefined,
  refreshMcpCatalogSourceConfigs: jest.fn(),
  mcpCatalogSources: null,
  mcpCatalogSourcesLoaded: false,
  mcpCatalogSourcesLoadError: undefined,
  refreshMcpCatalogSources: jest.fn(),
  ...overrides,
});

const renderComponent = (contextOverrides: Partial<McpCatalogSettingsContextType> = {}) => {
  const contextValue = createMockContextValue(contextOverrides);
  return {
    contextValue,
    ...render(
      <MemoryRouter>
        <McpCatalogSettingsContext.Provider value={contextValue}>
          <McpCatalogSettings />
        </McpCatalogSettingsContext.Provider>
      </MemoryRouter>,
    ),
  };
};

describe('McpCatalogSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call both refreshMcpCatalogSourceConfigs and refreshMcpCatalogSources after deleting a source', async () => {
    const user = userEvent.setup();
    const { contextValue } = renderComponent();

    await user.click(screen.getByTestId('delete-source-button'));

    await waitFor(() => {
      expect(contextValue.apiState.api.deleteMcpCatalogSourceConfig).toHaveBeenCalledWith(
        {},
        'source-1',
      );
    });

    expect(contextValue.refreshMcpCatalogSourceConfigs).toHaveBeenCalledTimes(1);
    expect(contextValue.refreshMcpCatalogSources).toHaveBeenCalledTimes(1);
  });

  it('should render empty state when no sources exist', () => {
    renderComponent({
      mcpCatalogSourceConfigs: { catalogs: [] },
    });

    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('should render table when sources exist', () => {
    renderComponent();

    expect(screen.getByTestId('page-content')).toBeInTheDocument();
    expect(screen.getByTestId('mcp-source-configs-table')).toBeInTheDocument();
  });
});
