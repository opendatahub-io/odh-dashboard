// Mock fixtures use the external MCP Registry's snake_case field names.
/* eslint-disable camelcase */
import * as React from 'react';
import { act } from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import { useNotification } from '@odh-dashboard/ui-core/contexts/NotificationContext';
import type { McpDeployModalData } from '@odh-dashboard/model-registry/types/mcpDeploymentTypes';
import McpRegistryDeployAction from '../McpRegistryDeployAction';
import { createMcpAccessEndpoint } from '../api';
import { MCPServer, MCPServerVersion, MCPTransportType, RHAI_DEPLOY_SPEC_META_KEY } from '../types';

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
  status: 'active',
  server_json: {
    name: 'kubernetes-mcp',
    version: '1.0.0',
    _meta: {
      [RHAI_DEPLOY_SPEC_META_KEY]: {
        source: { containerImage: { ref: 'ghcr.io/kubernetes/mcp-server:1.0.0' } },
        config: { port: 9090 },
      },
    },
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

  it('should disable the Deploy button and explain why when no version is selected', async () => {
    render(<McpRegistryDeployAction server={mockServer} namespace="test-project" />);

    const button = screen.getByTestId('mcp-registry-deploy-action-button');
    expect(button).toHaveAttribute('aria-disabled', 'true');

    await userEvent.hover(button);
    expect(await screen.findByText('Select a server version to deploy')).toBeInTheDocument();
  });

  it.each(['draft', 'deprecated', 'deleted'] as const)(
    'should disable the Deploy button and explain why when the selected version is %s',
    async (status) => {
      render(
        <McpRegistryDeployAction
          server={mockServer}
          version={{ ...mockVersion, status }}
          namespace="test-project"
        />,
      );

      const button = screen.getByTestId('mcp-registry-deploy-action-button');
      expect(button).toHaveAttribute('aria-disabled', 'true');

      await userEvent.hover(button);
      expect(
        await screen.findByText('Change this version to Active before deploying'),
      ).toBeInTheDocument();
    },
  );

  it('should not open the deploy modal when clicked while the selected version is not active', async () => {
    render(
      <McpRegistryDeployAction
        server={mockServer}
        version={{ ...mockVersion, status: 'draft' }}
        namespace="test-project"
      />,
    );

    await userEvent.click(screen.getByTestId('mcp-registry-deploy-action-button'));

    expect(screen.queryByTestId('mcp-registry-deploy-modal-stub')).not.toBeInTheDocument();
  });

  it('should disable the Deploy button and explain why while the deploy modal extension has not resolved', async () => {
    mockUseResolvedExtensions.mockReturnValue([[], false, []]);
    render(
      <McpRegistryDeployAction
        server={mockServer}
        version={mockVersion}
        namespace="test-project"
      />,
    );

    const button = screen.getByTestId('mcp-registry-deploy-action-button');
    expect(button).toHaveAttribute('aria-disabled', 'true');

    await userEvent.hover(button);
    expect(await screen.findByText('Checking deploy availability...')).toBeInTheDocument();
  });

  it('should disable the Deploy button and explain why the deploy modal extension is unavailable', async () => {
    mockUseResolvedExtensions.mockReturnValue([[], true, []]);
    render(
      <McpRegistryDeployAction
        server={mockServer}
        version={mockVersion}
        namespace="test-project"
      />,
    );

    const button = screen.getByTestId('mcp-registry-deploy-action-button');
    expect(button).toHaveAttribute('aria-disabled', 'true');

    await userEvent.hover(button);
    expect(
      await screen.findByText('Deploying is temporarily unavailable. Try reloading the page.'),
    ).toBeInTheDocument();
  });

  it('should disable the Deploy button and explain why when there is no current project', async () => {
    render(<McpRegistryDeployAction server={mockServer} version={mockVersion} namespace="" />);

    const button = screen.getByTestId('mcp-registry-deploy-action-button');
    expect(button).toHaveAttribute('aria-disabled', 'true');

    await userEvent.hover(button);
    expect(await screen.findByText('Select a project to deploy to')).toBeInTheDocument();
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

  it('should render only the first resolved extension if more than one provider registers the deploy modal', async () => {
    const secondModalComponent = jest.fn(() => (
      <div data-testid="mcp-registry-deploy-modal-stub-second" />
    ));
    mockUseResolvedExtensions.mockReturnValue([
      [
        {
          type: 'mcp-catalog.server/deploy-modal',
          uid: 'test-ext',
          pluginName: 'test',
          properties: { modalComponent: mockModalComponent },
          flags: {},
        },
        {
          type: 'mcp-catalog.server/deploy-modal',
          uid: 'test-ext-2',
          pluginName: 'test-2',
          properties: { modalComponent: secondModalComponent },
          flags: {},
        },
      ] as never,
      true,
      [],
    ]);

    render(
      <McpRegistryDeployAction
        server={mockServer}
        version={mockVersion}
        namespace="test-project"
      />,
    );
    await userEvent.click(screen.getByTestId('mcp-registry-deploy-action-button'));

    expect(screen.getByTestId('mcp-registry-deploy-modal-stub')).toBeInTheDocument();
    expect(screen.queryByTestId('mcp-registry-deploy-modal-stub-second')).not.toBeInTheDocument();
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

  it('should not open the deploy modal when clicked with no current project (empty namespace)', async () => {
    render(<McpRegistryDeployAction server={mockServer} version={mockVersion} namespace="" />);

    await userEvent.click(screen.getByTestId('mcp-registry-deploy-action-button'));

    expect(screen.queryByTestId('mcp-registry-deploy-modal-stub')).not.toBeInTheDocument();
  });

  it('should not open the deploy modal when clicked while the deploy modal extension has not resolved', async () => {
    mockUseResolvedExtensions.mockReturnValue([[], false, []]);
    render(
      <McpRegistryDeployAction
        server={mockServer}
        version={mockVersion}
        namespace="test-project"
      />,
    );

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
      { signal: expect.any(AbortSignal) },
      {
        endpoint_url: 'http://kubernetes-mcp.test-project.svc.cluster.local:8080/mcp',
        transport_type: 'streamable-http',
        server_version: '1.0.0',
      },
    );
    expect(mockNotification.success).toHaveBeenCalledWith('Deployment submitted');
    expect(mockNotification.warning).not.toHaveBeenCalled();
  });

  it('should abort the in-flight endpoint registration request when the component unmounts', async () => {
    const mockCreateEndpointCall = jest.fn().mockReturnValue(
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      new Promise<never>(() => {}),
    );
    mockCreateMcpAccessEndpoint.mockReturnValue(mockCreateEndpointCall);

    const { unmount } = render(
      <McpRegistryDeployAction
        server={mockServer}
        version={mockVersion}
        namespace="test-project"
      />,
    );
    await userEvent.click(screen.getByTestId('mcp-registry-deploy-action-button'));
    await userEvent.click(screen.getByTestId('mcp-registry-deploy-modal-stub-deployed'));

    const [opts] = mockCreateEndpointCall.mock.calls[0] as [{ signal: AbortSignal }];
    expect(opts.signal.aborted).toBe(false);

    unmount();

    expect(opts.signal.aborted).toBe(true);
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
      { signal: expect.any(AbortSignal) },
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
      'Deployment submitted, but endpoint registration failed',
      'endpoint creation failed',
    );
    expect(mockNotification.success).not.toHaveBeenCalled();
  });

  it('should not show a misleading warning toast when a newer deploy aborts an in-flight registration', async () => {
    let rejectFirstCall: (reason?: unknown) => void = () => undefined;
    const firstCall = jest.fn().mockReturnValue(
      new Promise((_resolve, reject) => {
        rejectFirstCall = reject;
      }),
    );
    const secondCall = jest.fn().mockResolvedValue({
      id: 'endpoint-1',
      server_name: 'kubernetes-mcp',
      endpoint_url: 'http://kubernetes-mcp.test-project.svc.cluster.local:8080/mcp',
      transport_type: 'streamable-http',
    });
    mockCreateMcpAccessEndpoint.mockReturnValueOnce(firstCall).mockReturnValueOnce(secondCall);

    render(
      <McpRegistryDeployAction
        server={mockServer}
        version={mockVersion}
        namespace="test-project"
      />,
    );
    await userEvent.click(screen.getByTestId('mcp-registry-deploy-action-button'));
    await userEvent.click(screen.getByTestId('mcp-registry-deploy-modal-stub-deployed'));
    const [firstOpts] = firstCall.mock.calls[0] as [{ signal: AbortSignal }];

    // A second deploy (e.g. a quick redeploy) aborts the first's still-pending
    // registration call before it settles.
    await userEvent.click(screen.getByTestId('mcp-registry-deploy-modal-stub-deployed'));
    expect(firstOpts.signal.aborted).toBe(true);

    // Simulate the aborted request actually rejecting, as a real fetch would.
    await act(async () => {
      rejectFirstCall(new DOMException('The operation was aborted.', 'AbortError'));
      await Promise.resolve();
    });

    expect(mockNotification.warning).not.toHaveBeenCalled();
    expect(mockNotification.success).toHaveBeenCalledWith('Deployment submitted');
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
      'Deployment submitted, but endpoint registration failed',
      'Failed to register the MCP access endpoint.',
    );
  });
});
