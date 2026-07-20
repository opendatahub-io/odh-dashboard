import '@testing-library/jest-dom';
import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import {
  McpCatalogSettingsContext,
  McpCatalogSettingsContextType,
} from '~/app/context/mcpCatalogSettings/McpCatalogSettingsContext';
import { McpCatalogSourceConfig, McpCatalogSourceType } from '~/app/mcpServerCatalogTypes';
import McpCatalogSourceConfigsTable from '~/app/pages/mcpCatalogSettings/screens/McpCatalogSourceConfigsTable';

jest.mock('mod-arch-shared', () => ({
  Table: ({
    data,
    rowRenderer,
    toolbarContent,
  }: {
    data: McpCatalogSourceConfig[];
    rowRenderer: (config: McpCatalogSourceConfig) => React.ReactNode;
    toolbarContent: React.ReactNode;
  }) => (
    <div data-testid="mcp-catalog-source-configs-table">
      {toolbarContent}
      <table>
        <tbody>{data.map((config) => rowRenderer(config))}</tbody>
      </table>
    </div>
  ),
}));

jest.mock('../McpCatalogSourceConfigsTableRow', () => {
  const MockRow: React.FC<{
    mcpCatalogSourceConfig: McpCatalogSourceConfig;
    onToggleUpdate: (checked: boolean, config: McpCatalogSourceConfig) => void;
  }> = ({ mcpCatalogSourceConfig, onToggleUpdate }) => (
    <tr data-testid={`row-${mcpCatalogSourceConfig.id}`}>
      <td>
        <button
          data-testid={`toggle-${mcpCatalogSourceConfig.id}`}
          onClick={() => onToggleUpdate(!mcpCatalogSourceConfig.enabled, mcpCatalogSourceConfig)}
        >
          Toggle
        </button>
      </td>
    </tr>
  );
  return { __esModule: true, default: MockRow };
});

jest.mock('../McpCatalogSourceConfigsTableColumns', () => ({
  mcpCatalogSourceConfigsColumns: [],
}));

const mockSourceConfigs: McpCatalogSourceConfig[] = [
  {
    id: 'source-1',
    name: 'Test Source 1',
    type: McpCatalogSourceType.YAML,
    yaml: 'test: true',
    enabled: true,
  },
];

const createMockContextValue = (
  overrides: Partial<McpCatalogSettingsContextType> = {},
): McpCatalogSettingsContextType => ({
  apiState: {
    apiAvailable: true,
    api: {
      getMcpCatalogSourceConfigs: jest.fn(),
      getMcpCatalogSourceConfig: jest.fn(),
      createMcpCatalogSourceConfig: jest.fn(),
      updateMcpCatalogSourceConfig: jest.fn().mockResolvedValue(undefined),
      deleteMcpCatalogSourceConfig: jest.fn(),
      previewMcpCatalogSource: jest.fn(),
    },
  },
  refreshAPIState: jest.fn(),
  mcpCatalogSourceConfigs: { catalogs: mockSourceConfigs },
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
          <McpCatalogSourceConfigsTable
            mcpCatalogSourceConfigs={mockSourceConfigs}
            onAddSource={jest.fn()}
            onDeleteSource={jest.fn()}
          />
        </McpCatalogSettingsContext.Provider>
      </MemoryRouter>,
    ),
  };
};

describe('McpCatalogSourceConfigsTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call both refreshMcpCatalogSourceConfigs and refreshMcpCatalogSources after toggling a source', async () => {
    const user = userEvent.setup();
    const { contextValue } = renderComponent();

    await user.click(screen.getByTestId('toggle-source-1'));

    await waitFor(() => {
      expect(contextValue.apiState.api.updateMcpCatalogSourceConfig).toHaveBeenCalledWith(
        {},
        'source-1',
        { enabled: false },
      );
    });

    expect(contextValue.refreshMcpCatalogSourceConfigs).toHaveBeenCalledTimes(1);
    expect(contextValue.refreshMcpCatalogSources).toHaveBeenCalledTimes(1);
  });

  it('should not call refresh functions when toggle fails', async () => {
    const user = userEvent.setup();
    const { contextValue } = renderComponent({
      apiState: {
        apiAvailable: true,
        api: {
          getMcpCatalogSourceConfigs: jest.fn(),
          getMcpCatalogSourceConfig: jest.fn(),
          createMcpCatalogSourceConfig: jest.fn(),
          updateMcpCatalogSourceConfig: jest.fn().mockRejectedValue(new Error('API error')),
          deleteMcpCatalogSourceConfig: jest.fn(),
          previewMcpCatalogSource: jest.fn(),
        },
      },
    });

    await user.click(screen.getByTestId('toggle-source-1'));

    await waitFor(() => {
      expect(contextValue.apiState.api.updateMcpCatalogSourceConfig).toHaveBeenCalled();
    });

    expect(contextValue.refreshMcpCatalogSourceConfigs).not.toHaveBeenCalled();
    expect(contextValue.refreshMcpCatalogSources).not.toHaveBeenCalled();
  });
});
