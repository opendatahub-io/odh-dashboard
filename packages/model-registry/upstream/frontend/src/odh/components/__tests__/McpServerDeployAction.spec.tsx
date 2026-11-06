import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { McpServer } from '~/app/mcpServerCatalogTypes';
import McpServerDeployAction from '~/odh/components/McpServerDeployAction';
import useMcpServerDeployAvailable from '~/odh/hooks/useMcpServerDeployAvailable';

jest.mock('~/odh/hooks/useMcpServerDeployAvailable', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('~/odh/components/McpServerInstallModal', () => ({
  __esModule: true,
  default: () => <div data-testid="mcp-deploy-modal-stub" />,
}));

const mockUseMcpServerDeployAvailable = jest.mocked(useMcpServerDeployAvailable);

const server = {
  id: '4',
  name: 'openshift-mcp-server',
  artifacts: [{ uri: 'oci://registry.redhat.io/openshift-mcp/openshift-mcp-server-rhel9:1.0' }],
} as unknown as McpServer;

const renderAction = (serverData: McpServer | null = server) =>
  render(<McpServerDeployAction server={{ data: serverData }} />);

const getButton = () => screen.getByTestId('mcp-deploy-button');

describe('McpServerDeployAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMcpServerDeployAvailable.mockReturnValue({ available: true, loaded: true });
  });

  it('should render nothing when the server has no deployable artifact', () => {
    renderAction({ ...server, artifacts: [] });
    expect(screen.queryByTestId('mcp-deploy-button')).not.toBeInTheDocument();
  });

  it('should enable the installer when MCP Lifecycle is available', async () => {
    renderAction();

    expect(getButton()).not.toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(getButton());
    expect(screen.getByTestId('mcp-deploy-modal-stub')).toBeInTheDocument();
  });

  it('should keep the installer disabled while MCP Lifecycle is loading', () => {
    mockUseMcpServerDeployAvailable.mockReturnValue({ available: false, loaded: false });
    renderAction();

    expect(getButton()).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should explain when MCP Lifecycle is unavailable', async () => {
    mockUseMcpServerDeployAvailable.mockReturnValue({ available: false, loaded: true });
    renderAction();

    expect(getButton()).toHaveAttribute('aria-disabled', 'true');
    await userEvent.hover(getButton());
    expect(
      await screen.findByText('MCP Lifecycle is not available in this cluster.'),
    ).toBeInTheDocument();
  });
});
