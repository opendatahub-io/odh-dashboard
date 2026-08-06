// Mock fixtures use the external MCP Registry's snake_case field names.
/* eslint-disable camelcase */
import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import { useNotification } from '@odh-dashboard/ui-core/contexts/NotificationContext';
import type { McpDeployModalData } from '@odh-dashboard/model-registry/types/mcpDeploymentTypes';
import McpRegistryDeployAction from '../McpRegistryDeployAction';
import { createMcpAccessEndpoint } from '../api';
import { MCPServer, MCPServerVersion, MCPTransportType } from '../types';

jest.mock('@odh-dashboard/plugin-core', () => ({
  useResolvedExtensions: jest.fn(),
}));

jest.mock('@odh-dashboard/ui-core/contexts/NotificationContext', () => ({
  useNotification: jest.fn(),
}));

jest.mock('../api', () => ({
  createMcpAccessEndpoint: jest.fn(),
}));

const mockUseResolvedExtensions = jest.mocked(useResolvedExtensions);
const mockUseNotification = jest.mocked(useNotification);
const mockCreateMcpAccessEndpoint = jest.mocked(createMcpAccessEndpoint);

const mockServer: MCPServer = { name: 'kubernetes-mcp', display_name: 'Kubernetes MCP' };
// Registry metadata (port 5555, /other-path) differs from deployed config (8080, /mcp)
// — proves we use the deployment's own applied config, not registry metadata.
const mockVersion: MCPServerVersion = {
  name: 'kubernetes-mcp',
  version: '1.0.0',
  server_json: {
    name: 'kubernetes-mcp',
    version: '1.0.0',
    _meta: { image: 'ghcr.io/kubernetes/mcp-server:1.0.0', configuration: 'port: 9090\n' },
    packages: [
      {
        registryType: 'oci',
        identifier: 'ghcr.io/kubernetes/mcp-server',
        transport: {
          type: MCPTransportType.STREAMABLE_HTTP,
          url: 'http://localhost:5555/other-path',
        },
      },
    ],
  },
};

const mockDeployedDeployment = {
  name: 'kubernetes-mcp',
  namespace: 'test-project',
  port: 8080,
  path: '/mcp',
};

const mockModalComponent = jest.fn(
  ({
    data,
    onClose,
    onDeployed,
  }: {
    data?: McpDeployModalData;
    onClose: (saved?: boolean) => void;
    onDeployed?: (deployment: {
      name: string;
      namespace: string;
      port: number;
      path?: string;
    }) => void | Promise<void>;
  }) => (
    <div data-testid="mcp-registry-deploy-modal-stub">
      <span data-testid="mcp-registry-deploy-modal-stub-image">{data?.image}</span>
      <span data-testid="mcp-registry-deploy-modal-stub-namespace">{data?.namespace}</span>
      <button
        type="button"
        data-testid="mcp-registry-deploy-modal-stub-close"
        onClick={() => onClose()}
      >
        Close
      </button>
      <button
        type="button"
        data-testid="mcp-registry-deploy-modal-stub-deployed"
        onClick={() => onDeployed?.(mockDeployedDeployment)}
      >
        Simulate deploy
      </button>
      <button
        type="button"
        data-testid="mcp-registry-deploy-modal-stub-deployed-no-path"
        onClick={() => onDeployed?.({ ...mockDeployedDeployment, path: undefined })}
      >
        Simulate deploy without a path
      </button>
    </div>
  ),
);

const mockNotification = { success: jest.fn(), warning: jest.fn(), error: jest.fn() };

const mockResolvedExtension = () =>
  mockUseResolvedExtensions.mockReturnValue([
    [
      {
        type: 'mcp-catalog.server/deploy-modal',
        uid: 'test-ext',
        pluginName: 'test',
        properties: { modalComponent: mockModalComponent },
        flags: {},
      } as never,
    ],
    true,
    [],
  ]);

describe('McpRegistryDeployAction', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseNotification.mockReturnValue(mockNotification as never);
    mockResolvedExtension();
  });

  it('should disable the Deploy button when no version is selected', () => {
    render(<McpRegistryDeployAction server={mockServer} namespace="test-project" />);

    expect(screen.getByTestId('mcp-registry-deploy-action-button')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('should disable the Deploy button while the deploy modal extension has not resolved', () => {
    mockUseResolvedExtensions.mockReturnValue([[], false, []]);
    render(
      <McpRegistryDeployAction
        server={mockServer}
        version={mockVersion}
        namespace="test-project"
      />,
    );

    expect(screen.getByTestId('mcp-registry-deploy-action-button')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('should disable the Deploy button when there is no current project', () => {
    render(<McpRegistryDeployAction server={mockServer} version={mockVersion} namespace="" />);

    expect(screen.getByTestId('mcp-registry-deploy-action-button')).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('should enable the Deploy button once a version is selected and the extension is available', () => {
    render(
      <McpRegistryDeployAction
        server={mockServer}
        version={mockVersion}
        namespace="test-project"
      />,
    );

    expect(screen.getByTestId('mcp-registry-deploy-action-button')).not.toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });

  it('should open the borrowed deploy modal prefilled from the version and current project when clicked', async () => {
    render(
      <McpRegistryDeployAction
        server={mockServer}
        version={mockVersion}
        namespace="test-project"
      />,
    );

    expect(screen.queryByTestId('mcp-registry-deploy-modal-stub')).not.toBeInTheDocument();

    await userEvent.click(screen.getByTestId('mcp-registry-deploy-action-button'));

    expect(screen.getByTestId('mcp-registry-deploy-modal-stub')).toBeInTheDocument();
    expect(screen.getByTestId('mcp-registry-deploy-modal-stub-image')).toHaveTextContent(
      'ghcr.io/kubernetes/mcp-server:1.0.0',
    );
    expect(screen.getByTestId('mcp-registry-deploy-modal-stub-namespace')).toHaveTextContent(
      'test-project',
    );
  });

  it('should close the deploy modal when onClose is called', async () => {
    render(
      <McpRegistryDeployAction
        server={mockServer}
        version={mockVersion}
        namespace="test-project"
      />,
    );

    await userEvent.click(screen.getByTestId('mcp-registry-deploy-action-button'));
    expect(screen.getByTestId('mcp-registry-deploy-modal-stub')).toBeInTheDocument();

    await userEvent.click(screen.getByTestId('mcp-registry-deploy-modal-stub-close'));

    expect(screen.queryByTestId('mcp-registry-deploy-modal-stub')).not.toBeInTheDocument();
  });

  it('should not open the deploy modal when clicked without a version selected', async () => {
    render(<McpRegistryDeployAction server={mockServer} namespace="test-project" />);

    await userEvent.click(screen.getByTestId('mcp-registry-deploy-action-button'));

    expect(screen.queryByTestId('mcp-registry-deploy-modal-stub')).not.toBeInTheDocument();
  });

  it('should register an MCPAccessEndpoint with the deployed CR config and show success toast', async () => {
    const mockCreateEndpointCall = jest.fn().mockResolvedValue({
      id: 'endpoint-1',
      server_name: 'kubernetes-mcp',
      endpoint_url: 'http://kubernetes-mcp.test-project.svc.cluster.local:8080/mcp',
      transport_type: 'streamable-http',
    });
    mockCreateMcpAccessEndpoint.mockReturnValue(mockCreateEndpointCall);

    render(
      <McpRegistryDeployAction
        server={mockServer}
        version={mockVersion}
        namespace="test-project"
      />,
    );
    await userEvent.click(screen.getByTestId('mcp-registry-deploy-action-button'));
    await userEvent.click(screen.getByTestId('mcp-registry-deploy-modal-stub-deployed'));

    // workspace comes from deployed CR namespace, port/path from applied config
    expect(mockCreateMcpAccessEndpoint).toHaveBeenCalledWith('kubernetes-mcp', 'test-project');
    expect(mockCreateEndpointCall).toHaveBeenCalledWith(
      {},
      {
        endpoint_url: 'http://kubernetes-mcp.test-project.svc.cluster.local:8080/mcp',
        transport_type: 'streamable-http',
        server_version: '1.0.0',
      },
    );
    expect(mockNotification.success).toHaveBeenCalledWith('Deployed and registered');
    expect(mockNotification.warning).not.toHaveBeenCalled();
  });

  it('should fall back to the default path when the deployment reports no path', async () => {
    const mockCreateEndpointCall = jest.fn().mockResolvedValue({
      id: 'endpoint-1',
      server_name: 'kubernetes-mcp',
      endpoint_url: 'http://kubernetes-mcp.test-project.svc.cluster.local:8080/mcp',
      transport_type: 'streamable-http',
    });
    mockCreateMcpAccessEndpoint.mockReturnValue(mockCreateEndpointCall);

    render(
      <McpRegistryDeployAction
        server={mockServer}
        version={mockVersion}
        namespace="test-project"
      />,
    );
    await userEvent.click(screen.getByTestId('mcp-registry-deploy-action-button'));
    await userEvent.click(screen.getByTestId('mcp-registry-deploy-modal-stub-deployed-no-path'));

    expect(mockCreateEndpointCall).toHaveBeenCalledWith(
      {},
      expect.objectContaining({
        endpoint_url: 'http://kubernetes-mcp.test-project.svc.cluster.local:8080/mcp',
      }),
    );
  });

  it('should show a warning toast (not fail) when MCPAccessEndpoint registration fails', async () => {
    mockCreateMcpAccessEndpoint.mockReturnValue(
      jest.fn().mockRejectedValue(new Error('endpoint creation failed')),
    );

    render(
      <McpRegistryDeployAction
        server={mockServer}
        version={mockVersion}
        namespace="test-project"
      />,
    );
    await userEvent.click(screen.getByTestId('mcp-registry-deploy-action-button'));
    await userEvent.click(screen.getByTestId('mcp-registry-deploy-modal-stub-deployed'));

    expect(mockNotification.warning).toHaveBeenCalledWith(
      'Deployed, but registration failed',
      'endpoint creation failed',
    );
    expect(mockNotification.success).not.toHaveBeenCalled();
  });

  it('should show the fallback detail message when the error has no message', async () => {
    mockCreateMcpAccessEndpoint.mockReturnValue(jest.fn().mockRejectedValue(new Error()));

    render(
      <McpRegistryDeployAction
        server={mockServer}
        version={mockVersion}
        namespace="test-project"
      />,
    );
    await userEvent.click(screen.getByTestId('mcp-registry-deploy-action-button'));
    await userEvent.click(screen.getByTestId('mcp-registry-deploy-modal-stub-deployed'));

    expect(mockNotification.warning).toHaveBeenCalledWith(
      'Deployed, but registration failed',
      'Failed to register the MCP access endpoint.',
    );
  });
});
