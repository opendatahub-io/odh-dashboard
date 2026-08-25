import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import useMcpServerDeployAvailable from '~/odh/hooks/useMcpServerDeployAvailable';
import type { McpDeployModalData } from '~/odh/types/mcpDeploymentTypes';
import McpRegistryServerDeployAction from '~/odh/components/McpRegistryServerDeployAction';

jest.mock('~/odh/hooks/useMcpServerDeployAvailable', () => ({
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
});
