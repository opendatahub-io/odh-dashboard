import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import type { McpServer } from '~/app/mcpServerCatalogTypes';
import McpServerDeployAction from '~/odh/components/McpServerDeployAction';
import useMcpServerDeployAvailable from '~/odh/hooks/useMcpServerDeployAvailable';
import useMcpServerConverter from '~/odh/hooks/useMcpServerConverter';
import useMcpServerDeployReadiness from '~/odh/hooks/useMcpServerDeployReadiness';
import { McpDeployReadinessReason, McpServerDeployReadiness } from '~/odh/types/mcpDeploymentTypes';
import { MCP_GATEWAY_SETUP_DOCS_URL } from '~/odh/const';

jest.mock('~/odh/hooks/useMcpServerDeployAvailable', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('~/odh/hooks/useMcpServerConverter', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('~/odh/hooks/useMcpServerDeployReadiness', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('~/odh/components/McpDeployModal', () => ({
  __esModule: true,
  default: () => <div data-testid="mcp-deploy-modal-stub" />,
}));

const mockUseMcpServerDeployAvailable = jest.mocked(useMcpServerDeployAvailable);
const mockUseMcpServerConverter = jest.mocked(useMcpServerConverter);
const mockUseMcpServerDeployReadiness = jest.mocked(useMcpServerDeployReadiness);

const server = {
  id: '4',
  name: 'com.redhat/openshift-mcp-server',
  artifacts: [{ uri: 'oci://registry.redhat.io/openshift-mcp/openshift-mcp-server-rhel9:1.0' }],
} as unknown as McpServer;

const setReadiness = (
  data: McpServerDeployReadiness | null,
  loaded: boolean,
  error?: Error,
): void => {
  mockUseMcpServerDeployReadiness.mockReturnValue([data, loaded, error, jest.fn()]);
};

const renderAction = (serverData: McpServer | null = server) =>
  render(
    <MemoryRouter initialEntries={['/ai-hub/mcp-servers/catalog/4']}>
      <Routes>
        <Route
          path="/ai-hub/mcp-servers/catalog/:serverId"
          element={<McpServerDeployAction server={{ data: serverData }} />}
        />
      </Routes>
    </MemoryRouter>,
  );

const getButton = () => screen.getByTestId('mcp-deploy-button');

const expectTooltip = async (text: string) => {
  await userEvent.hover(getButton());
  expect(await screen.findByText(text)).toBeInTheDocument();
};

const expectGatewayPopover = async (text: string) => {
  await userEvent.hover(getButton());
  const popover = await screen.findByTestId('mcp-deploy-gateway-popover');
  expect(popover).toHaveTextContent('MCP gateway required');
  expect(popover).toHaveTextContent(text);
};

describe('McpServerDeployAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMcpServerDeployAvailable.mockReturnValue({ available: true, loaded: true });
    mockUseMcpServerConverter.mockReturnValue([null, false, undefined]);
    setReadiness({ gatewayRequired: false, deployable: true }, true);
  });

  it('should pass the server id from the route to the readiness hook', () => {
    renderAction();
    expect(mockUseMcpServerDeployReadiness).toHaveBeenCalledWith('4');
  });

  it.each([
    ['loading', { available: false, loaded: false }],
    ['not available', { available: false, loaded: true }],
  ])('should not check deploy readiness while MCP Lifecycle is %s', (_, lifecycle) => {
    mockUseMcpServerDeployAvailable.mockReturnValue(lifecycle);
    renderAction();

    expect(mockUseMcpServerDeployReadiness).toHaveBeenCalledWith('');
    expect(mockUseMcpServerDeployReadiness).not.toHaveBeenCalledWith('4');
  });

  it('should render nothing when the server has no deployable artifact', () => {
    renderAction({ ...server, artifacts: [] });
    expect(screen.queryByTestId('mcp-deploy-button')).not.toBeInTheDocument();
  });

  it('should enable Deploy for a server that does not require a gateway', async () => {
    renderAction();

    expect(getButton()).not.toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByTestId('mcp-deploy-gateway-docs-link')).not.toBeInTheDocument();
    await userEvent.click(getButton());
    expect(screen.getByTestId('mcp-deploy-modal-stub')).toBeInTheDocument();
  });

  it('should enable Deploy when a required gateway is available', async () => {
    setReadiness({ gatewayRequired: true, deployable: true }, true);
    renderAction();

    expect(getButton()).not.toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByTestId('mcp-deploy-gateway-docs-link')).not.toBeInTheDocument();
    await userEvent.click(getButton());
    expect(screen.getByTestId('mcp-deploy-modal-stub')).toBeInTheDocument();
  });

  it('should keep the MCP Lifecycle check first', async () => {
    mockUseMcpServerDeployAvailable.mockReturnValue({ available: false, loaded: true });
    setReadiness({ gatewayRequired: true, deployable: true }, true);
    renderAction();

    expect(getButton()).toHaveAttribute('aria-disabled', 'true');
    await expectTooltip('MCP Lifecycle is not available in this cluster.');
  });

  it('should show a loading state while readiness is checked', () => {
    setReadiness(null, false);
    renderAction();

    expect(getButton()).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it.each([
    [
      McpDeployReadinessReason.NO_GATEWAY_AVAILABLE,
      'This MCP server requires an MCP gateway, and none is available. Ask your cluster administrator to set up an MCP gateway.',
    ],
    [
      McpDeployReadinessReason.OPERATOR_NOT_READY,
      'This MCP server requires an MCP gateway, but the MCP lifecycle operator is not ready. Try again later or contact your cluster administrator.',
    ],
    [
      McpDeployReadinessReason.GATEWAY_STATUS_UNAVAILABLE,
      'This MCP server requires an MCP gateway, but MCP gateway availability could not be determined. Try again later or contact your cluster administrator.',
    ],
  ])('should block Deploy with an explanation and docs link for %s', async (reason, tooltip) => {
    setReadiness({ gatewayRequired: true, deployable: false, reason }, true);
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
    renderAction();

    expect(getButton()).toHaveAttribute('aria-disabled', 'true');
    expect(getButton()).toHaveAccessibleDescription(tooltip);
    // The docs link is in the popover, not next to the button.
    expect(screen.queryByTestId('mcp-deploy-gateway-docs-link')).not.toBeInTheDocument();
    await expectGatewayPopover(tooltip);

    await userEvent.click(getButton());
    expect(screen.queryByTestId('mcp-deploy-modal-stub')).not.toBeInTheDocument();

    const docsLink = await screen.findByTestId('mcp-deploy-gateway-docs-link');
    expect(docsLink).toHaveTextContent('How to set up an MCP gateway');
    await userEvent.click(docsLink);
    expect(openSpy).toHaveBeenCalledWith(MCP_GATEWAY_SETUP_DOCS_URL);
    openSpy.mockRestore();
  });

  it('should fall back to a generic explanation for an unknown reason', async () => {
    setReadiness(
      {
        gatewayRequired: true,
        deployable: false,
        reason: 'SOMETHING_NEW' as McpDeployReadinessReason,
      },
      true,
    );
    renderAction();

    expect(getButton()).toHaveAttribute('aria-disabled', 'true');
    await expectGatewayPopover(
      'This MCP server requires an MCP gateway, but MCP gateway availability could not be determined. Try again later or contact your cluster administrator.',
    );
  });

  it('should block Deploy without a gateway docs link when not deployable for another reason', async () => {
    setReadiness({ gatewayRequired: false, deployable: false }, true);
    renderAction();

    expect(getButton()).toHaveAttribute('aria-disabled', 'true');
    await userEvent.hover(getButton());
    expect(await screen.findByRole('tooltip')).toBeInTheDocument();
    expect(screen.queryByTestId('mcp-deploy-gateway-popover')).not.toBeInTheDocument();
    expect(screen.queryByTestId('mcp-deploy-gateway-docs-link')).not.toBeInTheDocument();
  });

  it('should block Deploy without a docs link when the readiness check fails', async () => {
    setReadiness(null, false, new Error('Service Unavailable'));
    renderAction();

    expect(getButton()).toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByTestId('mcp-deploy-gateway-docs-link')).not.toBeInTheDocument();
    await expectTooltip(
      'Unable to check the deployment prerequisites for this MCP server. Try again later.',
    );
  });
});
