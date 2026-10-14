import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import useMcpServerDeployAvailable from '~/odh/hooks/useMcpServerDeployAvailable';
import useMcpImageDeployReadiness from '~/odh/hooks/useMcpImageDeployReadiness';
import {
  McpDeployReadinessReason,
  type McpDeployModalData,
  type McpServerDeployReadiness,
} from '~/odh/types/mcpDeploymentTypes';
import McpRegistryServerDeployAction from '~/odh/components/McpRegistryServerDeployAction';
import { MCP_GATEWAY_POPOVER_BODY_ID } from '~/odh/components/McpGatewayRequiredPopover';
import { MCP_GATEWAY_SETUP_DOCS_URL } from '~/odh/const';

jest.mock('~/odh/hooks/useMcpServerDeployAvailable', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('~/odh/hooks/useMcpImageDeployReadiness', () => ({
  __esModule: true,
  default: jest.fn(),
}));

jest.mock('~/odh/components/McpDeployModal', () => {
  const MockDeployModal = ({
    data,
    onClose,
    onDeployed,
  }: {
    data?: McpDeployModalData;
    onClose: () => void;
    onDeployed?: (deployment: { name: string; namespace: string }) => void;
  }) => (
    <div data-testid="mcp-deploy-modal-stub">
      <span data-testid="modal-image">{data?.image}</span>
      <span data-testid="modal-namespace">{data?.namespace}</span>
      <button type="button" data-testid="modal-close" onClick={() => onClose()}>
        Close
      </button>
      <button
        type="button"
        data-testid="modal-deployed"
        onClick={() => onDeployed?.({ name: 'deployed-server', namespace: 'test-ns' })}
      >
        Simulate deploy
      </button>
    </div>
  );
  return { __esModule: true, default: MockDeployModal };
});

const mockUseMcpServerDeployAvailable = jest.mocked(useMcpServerDeployAvailable);
const mockUseMcpImageDeployReadiness = jest.mocked(useMcpImageDeployReadiness);

const setReadiness = (
  data: McpServerDeployReadiness | null,
  loaded: boolean,
  error?: Error,
): void => {
  mockUseMcpImageDeployReadiness.mockReturnValue([data, loaded, error, jest.fn()]);
};

const openShiftDeployData: McpDeployModalData = {
  registryServer: 'io.example/renamed-openshift-mcp-server',
  registryVersion: '1.0.0',
  displayName: 'OpenShift MCP - 1.0.0',
  namespace: 'test-project',
  image: 'registry.redhat.io/openshift-mcp/openshift-mcp-server-rhel9:1.0',
};

const NO_GATEWAY_TOOLTIP =
  'This MCP server requires an MCP gateway, and none is available. Ask your cluster administrator to set up an MCP gateway.';

const mockDeployData: McpDeployModalData = {
  registryServer: 'kubernetes-mcp',
  registryVersion: '1.0.0',
  displayName: 'Kubernetes MCP - 1.0.0',
  namespace: 'test-project',
  image: 'ghcr.io/kubernetes/mcp-server:1.0.0',
  yaml: 'config:\n  port: 9090\n',
};

const renderAction = (
  props: Partial<React.ComponentProps<typeof McpRegistryServerDeployAction>> = {},
) =>
  render(
    <MemoryRouter>
      <McpRegistryServerDeployAction deployData={mockDeployData} {...props} />
    </MemoryRouter>,
  );

describe('McpRegistryServerDeployAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMcpServerDeployAvailable.mockReturnValue({ available: true, loaded: true });
    setReadiness({ gatewayRequired: false, deployable: true }, true);
  });

  it('should render an enabled Deploy button when deploy data is provided and MCP is available', () => {
    renderAction();

    const button = screen.getByTestId('mcp-registry-deploy-action-button');
    expect(button).not.toHaveAttribute('aria-disabled', 'true');
  });

  it('should disable the button with a caller-provided reason', async () => {
    renderAction({ disabledReason: 'Change this version to Active before deploying' });

    const button = screen.getByTestId('mcp-registry-deploy-action-button');
    expect(button).toHaveAttribute('aria-disabled', 'true');

    await userEvent.hover(button);
    expect(
      await screen.findByText('Change this version to Active before deploying'),
    ).toBeInTheDocument();
  });

  it('should disable the button while MCP Lifecycle availability is loading', async () => {
    mockUseMcpServerDeployAvailable.mockReturnValue({ available: false, loaded: false });
    renderAction();

    const button = screen.getByTestId('mcp-registry-deploy-action-button');
    expect(button).toHaveAttribute('aria-disabled', 'true');

    await userEvent.hover(button);
    expect(await screen.findByText('Checking deploy availability...')).toBeInTheDocument();
  });

  it('should disable the button when MCP Lifecycle is not available', async () => {
    mockUseMcpServerDeployAvailable.mockReturnValue({ available: false, loaded: true });
    renderAction();

    const button = screen.getByTestId('mcp-registry-deploy-action-button');
    expect(button).toHaveAttribute('aria-disabled', 'true');

    await userEvent.hover(button);
    expect(
      await screen.findByText('MCP Lifecycle is not available in this cluster.'),
    ).toBeInTheDocument();
  });

  it('should prioritize caller-provided disabledReason over MCP availability', async () => {
    mockUseMcpServerDeployAvailable.mockReturnValue({ available: false, loaded: true });
    renderAction({ disabledReason: 'Select a server version to deploy' });

    const button = screen.getByTestId('mcp-registry-deploy-action-button');
    expect(button).toHaveAttribute('aria-disabled', 'true');

    await userEvent.hover(button);
    expect(await screen.findByText('Select a server version to deploy')).toBeInTheDocument();
  });

  it('should not open the modal when the button is disabled', async () => {
    renderAction({ disabledReason: 'Not deployable' });

    await userEvent.click(screen.getByTestId('mcp-registry-deploy-action-button'));

    expect(screen.queryByTestId('mcp-deploy-modal-stub')).not.toBeInTheDocument();
  });

  it('should open the deploy modal prefilled with the provided data', async () => {
    renderAction();

    await userEvent.click(screen.getByTestId('mcp-registry-deploy-action-button'));

    expect(screen.getByTestId('mcp-deploy-modal-stub')).toBeInTheDocument();
    expect(screen.getByTestId('modal-image')).toHaveTextContent(
      'ghcr.io/kubernetes/mcp-server:1.0.0',
    );
    expect(screen.getByTestId('modal-namespace')).toHaveTextContent('test-project');
  });

  it('should close the deploy modal when onClose is called', async () => {
    renderAction();

    await userEvent.click(screen.getByTestId('mcp-registry-deploy-action-button'));
    expect(screen.getByTestId('mcp-deploy-modal-stub')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('modal-close'));
    expect(screen.queryByTestId('mcp-deploy-modal-stub')).not.toBeInTheDocument();
  });

  it('should call onDeployed when a deployment completes', async () => {
    const onDeployed = jest.fn();
    renderAction({ onDeployed });

    await userEvent.click(screen.getByTestId('mcp-registry-deploy-action-button'));
    await userEvent.click(screen.getByTestId('modal-deployed'));

    expect(onDeployed).toHaveBeenCalledWith({ name: 'deployed-server', namespace: 'test-ns' });
  });

  it('should return null from the extension wrapper for invalid props', () => {
    const { container } = render(
      <MemoryRouter>
        <McpRegistryServerDeployAction
          {...({ deployData: 'not-an-object' } as unknown as React.ComponentProps<
            typeof McpRegistryServerDeployAction
          >)}
        />
      </MemoryRouter>,
    );
    expect(container.querySelector('[data-testid="mcp-registry-deploy-action-button"]')).toBeNull();
  });
  it('should check deploy readiness for the prefilled namespace and image only', () => {
    renderAction({ deployData: openShiftDeployData });

    expect(mockUseMcpImageDeployReadiness).toHaveBeenCalledWith(
      'test-project',
      'registry.redhat.io/openshift-mcp/openshift-mcp-server-rhel9:1.0',
    );
  });

  it('should leave the gateway check to the BFF when the version has no image', async () => {
    // Never-loading readiness: it must not be consulted without an image.
    setReadiness(null, false);
    renderAction({ deployData: { ...openShiftDeployData, image: '' } });

    const button = screen.getByTestId('mcp-registry-deploy-action-button');
    expect(button).not.toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    await userEvent.click(button);
    expect(screen.getByTestId('mcp-deploy-modal-stub')).toBeInTheDocument();
  });

  it.each([
    [McpDeployReadinessReason.NO_GATEWAY_AVAILABLE, NO_GATEWAY_TOOLTIP],
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
    renderAction({ deployData: openShiftDeployData });

    const button = screen.getByTestId('mcp-registry-deploy-action-button');
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(screen.queryByTestId('mcp-deploy-gateway-docs-link')).not.toBeInTheDocument();

    // Hovering opens a popover with the reason and the docs link, not a plain tooltip.
    await userEvent.hover(button);
    const popover = await screen.findByTestId('mcp-deploy-gateway-popover');
    expect(popover).toHaveTextContent('MCP gateway required');
    expect(popover).toHaveTextContent(tooltip);

    await userEvent.click(button);
    expect(screen.queryByTestId('mcp-deploy-modal-stub')).not.toBeInTheDocument();

    const docsLink = await screen.findByTestId('mcp-deploy-gateway-docs-link');
    expect(docsLink).toHaveTextContent('How to set up an MCP gateway');
    await userEvent.click(docsLink);
    expect(openSpy).toHaveBeenCalledWith(MCP_GATEWAY_SETUP_DOCS_URL);
    openSpy.mockRestore();
  });

  it('should let keyboard users reach the docs link from the blocked Deploy button', async () => {
    setReadiness(
      {
        gatewayRequired: true,
        deployable: false,
        reason: McpDeployReadinessReason.NO_GATEWAY_AVAILABLE,
      },
      true,
    );
    renderAction({ deployData: openShiftDeployData });

    const button = screen.getByTestId('mcp-registry-deploy-action-button');
    await userEvent.tab();
    expect(button).toHaveFocus();
    const popover = await screen.findByTestId('mcp-deploy-gateway-popover');
    expect(popover).toHaveTextContent(NO_GATEWAY_TOOLTIP);
    // Screen readers announce the explanation with the button.
    expect(button).toHaveAttribute('aria-describedby', MCP_GATEWAY_POPOVER_BODY_ID);
    expect(document.getElementById(MCP_GATEWAY_POPOVER_BODY_ID)).toHaveTextContent(
      NO_GATEWAY_TOOLTIP,
    );

    await userEvent.tab();
    expect(screen.getByTestId('mcp-deploy-gateway-docs-link')).toHaveFocus();
    expect(screen.getByTestId('mcp-deploy-gateway-popover')).toBeInTheDocument();

    // Escape closes the popover and returns focus to Deploy.
    await userEvent.keyboard('{Escape}');
    expect(button).toHaveFocus();
    await waitFor(() =>
      expect(screen.queryByTestId('mcp-deploy-gateway-popover')).not.toBeInTheDocument(),
    );
  });

  it('should enable Deploy when a required gateway is available', async () => {
    setReadiness({ gatewayRequired: true, deployable: true }, true);
    renderAction({ deployData: openShiftDeployData });

    const button = screen.getByTestId('mcp-registry-deploy-action-button');
    expect(button).not.toHaveAttribute('aria-disabled', 'true');
    await userEvent.hover(button);
    expect(screen.queryByTestId('mcp-deploy-gateway-popover')).not.toBeInTheDocument();
    await userEvent.click(button);
    expect(screen.getByTestId('mcp-deploy-modal-stub')).toBeInTheDocument();
  });

  it('should show a loading state while deploy readiness is checked', () => {
    setReadiness(null, false);
    renderAction({ deployData: openShiftDeployData });

    expect(screen.getByTestId('mcp-registry-deploy-action-button')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('should block Deploy without a docs link when the readiness check fails', async () => {
    setReadiness(null, false, new Error('Service Unavailable'));
    renderAction({ deployData: openShiftDeployData });

    const button = screen.getByTestId('mcp-registry-deploy-action-button');
    expect(button).toHaveAttribute('aria-disabled', 'true');
    await userEvent.hover(button);
    expect(
      await screen.findByText(
        'Unable to check the deployment prerequisites for this MCP server. Try again later.',
      ),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('mcp-deploy-gateway-popover')).not.toBeInTheDocument();
  });

  it('should keep the page and MCP Lifecycle reasons ahead of the gateway check', async () => {
    setReadiness(
      {
        gatewayRequired: true,
        deployable: false,
        reason: McpDeployReadinessReason.NO_GATEWAY_AVAILABLE,
      },
      true,
    );
    const { unmount } = renderAction({
      deployData: openShiftDeployData,
      disabledReason: 'Change this version to Active before deploying',
    });
    await userEvent.hover(screen.getByTestId('mcp-registry-deploy-action-button'));
    expect(
      await screen.findByText('Change this version to Active before deploying'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('mcp-deploy-gateway-popover')).not.toBeInTheDocument();
    unmount();

    mockUseMcpServerDeployAvailable.mockReturnValue({ available: false, loaded: true });
    renderAction({ deployData: openShiftDeployData });
    await userEvent.hover(screen.getByTestId('mcp-registry-deploy-action-button'));
    expect(
      await screen.findByText('MCP Lifecycle is not available in this cluster.'),
    ).toBeInTheDocument();
    expect(screen.queryByText(NO_GATEWAY_TOOLTIP)).not.toBeInTheDocument();
  });

  it('should keep Deploy disabled without deploy data', () => {
    renderAction({ deployData: undefined });

    expect(screen.getByTestId('mcp-registry-deploy-action-button')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });
});
