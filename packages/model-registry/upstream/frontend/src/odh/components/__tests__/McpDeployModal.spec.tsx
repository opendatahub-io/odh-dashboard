import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import McpDeployModal from '~/odh/components/McpDeployModal';
import { createMcpDeployment, updateMcpDeployment } from '~/odh/api/mcpCatalogDeployment/service';
import { McpDeployModalData } from '~/odh/types/mcpDeploymentTypes';
import { mockMcpDeployment } from '~/__mocks__/mockMcpDeployment';

jest.mock('~/odh/api/mcpCatalogDeployment/service', () => ({
  createMcpDeployment: jest.fn(),
  updateMcpDeployment: jest.fn(),
}));

jest.mock('@odh-dashboard/internal/app/ThemeContext', () => ({
  useThemeContext: () => ({ theme: 'light' }),
}));

jest.mock('@patternfly/react-code-editor', () => ({
  Language: { yaml: 'yaml' },
  CodeEditor: ({
    code,
    onCodeChange,
    'data-testid': dataTestId,
  }: {
    code: string;
    onCodeChange: (value: string) => void;
    'data-testid'?: string;
  }) => (
    <textarea
      data-testid={dataTestId}
      value={code}
      onChange={(e) => onCodeChange(e.target.value)}
    />
  ),
}));

const mockNavigate = jest.fn();
jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useNavigate: () => mockNavigate,
}));

jest.mock('~/odh/components/NamespaceSelectorFieldWrapper', () => {
  function MockNamespaceSelectorFieldWrapper({
    selectedNamespace,
    onSelect,
    isDisabled,
  }: {
    selectedNamespace: string;
    onSelect: (ns: string) => void;
    isDisabled?: boolean;
  }) {
    return (
      <button
        type="button"
        data-testid="mcp-deploy-namespace-select"
        onClick={() => onSelect('test-project')}
        disabled={isDisabled}
      >
        {selectedNamespace || 'Select a project'}
      </button>
    );
  }
  return MockNamespaceSelectorFieldWrapper;
});

const mockCreateMcpDeployment = jest.mocked(createMcpDeployment);
const mockUpdateMcpDeployment = jest.mocked(updateMcpDeployment);

const mockDeployment = () =>
  mockMcpDeployment({
    name: 'my-server',
    namespace: 'test-project',
    uid: 'uid-1',
    creationTimestamp: '2026-01-01T00:00:00Z',
    image: 'quay.io/mcp/weather:1.2.0',
    conditions: [],
  });

const renderModal = (data?: McpDeployModalData, onDeployed?: jest.Mock, onClose = jest.fn()) =>
  render(
    <MemoryRouter>
      <McpDeployModal data={data} onClose={onClose} onDeployed={onDeployed} />
    </MemoryRouter>,
  );

describe('McpDeployModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should disable the OCI image field for catalog deployments', () => {
    renderModal({ image: 'quay.io/mcp/weather:1.2.0', serverName: 'weather' });

    const imageInput = screen.getByTestId('mcp-deploy-oci-image-input');
    expect(imageInput).toHaveValue('quay.io/mcp/weather:1.2.0');
    expect(imageInput).toBeDisabled();
  });

  it('should leave the OCI image field editable for registry deployments', async () => {
    renderModal({
      image: 'quay.io/mcp/weather:1.2.0',
      registryServer: 'io.github.example/weather-server',
      registryVersion: '1.2.0',
      namespace: 'test-project',
    });

    const imageInput = screen.getByTestId('mcp-deploy-oci-image-input');
    expect(imageInput).toHaveValue('quay.io/mcp/weather:1.2.0');
    expect(imageInput).not.toBeDisabled();

    await userEvent.clear(imageInput);
    await userEvent.type(imageInput, 'quay.io/mcp/weather:2.0.0');
    expect(imageInput).toHaveValue('quay.io/mcp/weather:2.0.0');
  });

  it('should render a normal, editable YAML editor whether or not configuration was prefilled', async () => {
    renderModal({ image: 'quay.io/mcp/weather:1.2.0', yaml: '', serverName: 'weather' });

    const yamlEditor = screen.getByTestId('mcp-deploy-yaml-editor');
    expect(yamlEditor).toHaveValue('');

    await userEvent.type(yamlEditor, 'config:\n  port: 8080\n');
    expect(yamlEditor).toHaveValue('config:\n  port: 8080\n');
  });

  it('should disable the project selector for registry-sourced deploys', () => {
    renderModal({
      image: 'quay.io/mcp/weather:1.2.0',
      displayName: 'Weather MCP',
      registryServer: 'io.github.example/weather-server',
      registryVersion: '1.2.0',
      namespace: 'test-project',
    });

    const nsButton = screen.getByTestId('mcp-deploy-namespace-select');
    expect(nsButton).toBeDisabled();
    expect(nsButton).toHaveTextContent('test-project');
  });

  it('should forward registryServer and registryVersion when deploying from the MCP Registry flow', async () => {
    mockCreateMcpDeployment.mockReturnValue(jest.fn().mockResolvedValue(mockDeployment()));

    renderModal({
      image: 'quay.io/mcp/weather:1.2.0',
      displayName: 'Weather MCP',
      registryServer: 'io.github.example/weather-server',
      registryVersion: '1.2.0',
      namespace: 'test-project',
    });

    await userEvent.click(screen.getByTestId('modal-submit-button'));

    await waitFor(() => expect(mockCreateMcpDeployment).toHaveBeenCalled());
    const createCall = mockCreateMcpDeployment.mock.results[0].value as jest.Mock;
    expect(createCall).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        registryServer: 'io.github.example/weather-server',
        registryVersion: '1.2.0',
      }),
    );
  });

  it('should call onDeployed and navigate to the deployments page for registry-sourced deploys', async () => {
    const onDeployed = jest.fn();
    const created = mockDeployment();
    mockCreateMcpDeployment.mockReturnValue(jest.fn().mockResolvedValue(created));

    renderModal(
      {
        image: 'quay.io/mcp/weather:1.2.0',
        displayName: 'Weather MCP',
        registryServer: 'io.github.example/weather-server',
        registryVersion: '1.2.0',
        namespace: 'test-project',
      },
      onDeployed,
    );

    await userEvent.click(screen.getByTestId('modal-submit-button'));

    await waitFor(() => expect(onDeployed).toHaveBeenCalledWith(created));
    expect(mockNavigate).toHaveBeenCalledWith('/ai-hub/mcp-servers/deployments/test-project');
  });

  it('should still treat the deploy as successful if onDeployed rejects', async () => {
    const created = mockDeployment();
    mockCreateMcpDeployment.mockReturnValue(jest.fn().mockResolvedValue(created));
    const onDeployed = jest.fn().mockRejectedValue(new Error('registration failed'));
    const onClose = jest.fn();

    renderModal(
      {
        image: 'quay.io/mcp/weather:1.2.0',
        displayName: 'Weather MCP',
        registryServer: 'io.github.example/weather-server',
        registryVersion: '1.2.0',
        namespace: 'test-project',
      },
      onDeployed,
      onClose,
    );

    await userEvent.click(screen.getByTestId('modal-submit-button'));

    await waitFor(() => expect(onDeployed).toHaveBeenCalledWith(created));
    expect(onClose).toHaveBeenCalledWith(true);
    expect(mockNavigate).toHaveBeenCalledWith('/ai-hub/mcp-servers/deployments/test-project');
    expect(screen.queryByText('registration failed')).not.toBeInTheDocument();
  });

  it('should navigate to deployments page after a successful catalog deploy', async () => {
    mockCreateMcpDeployment.mockReturnValue(jest.fn().mockResolvedValue(mockDeployment()));

    renderModal({
      image: 'quay.io/mcp/weather:1.2.0',
      displayName: 'Weather MCP',
      serverName: 'weather',
    });

    await userEvent.click(screen.getByTestId('mcp-deploy-namespace-select'));
    await userEvent.click(screen.getByTestId('modal-submit-button'));

    await waitFor(() =>
      expect(mockNavigate).toHaveBeenCalledWith('/ai-hub/mcp-servers/deployments/test-project'),
    );
  });

  it('should call createMcpDeployment without registry fields for the catalog flow', async () => {
    mockCreateMcpDeployment.mockReturnValue(jest.fn().mockResolvedValue(mockDeployment()));

    renderModal({
      image: 'quay.io/mcp/weather:1.2.0',
      displayName: 'Weather MCP',
      serverName: 'weather',
    });

    await userEvent.click(screen.getByTestId('mcp-deploy-namespace-select'));
    await userEvent.click(screen.getByTestId('modal-submit-button'));

    await waitFor(() => expect(mockCreateMcpDeployment).toHaveBeenCalled());
    const createCall = mockCreateMcpDeployment.mock.results[0].value as jest.Mock;
    expect(createCall).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        serverName: 'weather',
        registryServer: undefined,
        registryVersion: undefined,
      }),
    );
  });

  it('should sync the OCI image field when data arrives after the modal has already mounted', () => {
    const onClose = jest.fn();
    const { rerender } = render(
      <MemoryRouter>
        <McpDeployModal data={undefined} onClose={onClose} isLoading />
      </MemoryRouter>,
    );

    rerender(
      <MemoryRouter>
        <McpDeployModal
          data={{ image: 'quay.io/mcp/weather:1.2.0', serverName: 'weather' }}
          onClose={onClose}
          isLoading={false}
        />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('mcp-deploy-oci-image-input')).toHaveValue(
      'quay.io/mcp/weather:1.2.0',
    );
  });

  it('should sync the YAML field when data arrives after the modal has already mounted', () => {
    const onClose = jest.fn();
    const { rerender } = render(
      <MemoryRouter>
        <McpDeployModal data={undefined} onClose={onClose} isLoading />
      </MemoryRouter>,
    );

    rerender(
      <MemoryRouter>
        <McpDeployModal
          data={{
            image: 'quay.io/mcp/weather:1.2.0',
            yaml: 'config:\n  port: 8080\n',
            serverName: 'weather',
          }}
          onClose={onClose}
          isLoading={false}
        />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('mcp-deploy-yaml-editor')).toHaveValue('config:\n  port: 8080\n');
  });

  it('should sync the image and yaml fields when they transition to an empty value', () => {
    const onClose = jest.fn();
    const { rerender } = render(
      <MemoryRouter>
        <McpDeployModal
          data={{
            image: 'quay.io/mcp/weather:1.2.0',
            yaml: 'config:\n  port: 8080\n',
            serverName: 'weather',
          }}
          onClose={onClose}
        />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('mcp-deploy-oci-image-input')).toHaveValue(
      'quay.io/mcp/weather:1.2.0',
    );

    rerender(
      <MemoryRouter>
        <McpDeployModal data={{ image: '', yaml: '', serverName: 'weather' }} onClose={onClose} />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('mcp-deploy-oci-image-input')).toHaveValue('');
    expect(screen.getByTestId('mcp-deploy-yaml-editor')).toHaveValue('');
  });

  it('should prefill empty image and yaml fields when missing from data, and leave the image field editable', () => {
    renderModal({
      image: '',
      yaml: '',
      displayName: 'Weather MCP',
      registryServer: 'io.github.example/weather-server',
      registryVersion: '1.2.0',
      namespace: 'test-project',
    });

    const imageInput = screen.getByTestId('mcp-deploy-oci-image-input') as HTMLInputElement;
    const yamlEditor = screen.getByTestId('mcp-deploy-yaml-editor') as HTMLTextAreaElement;

    expect(imageInput.value).toBe('');
    expect(yamlEditor.value).toBe('');
    // The PR's stated contract is "left empty AND user-editable" -- assert both halves
    // together so a regression that re-disables the field when it's empty (e.g. an
    // `isDisabled={!ociImageValue}` mistake) would be caught here, not just by the
    // separately-prefilled-value editability test above.
    expect(imageInput).not.toBeDisabled();
  });

  it('should show the project as a fixed, disabled field when editing an existing deployment', () => {
    renderModal({
      name: 'my-server',
      displayName: 'Weather MCP',
      image: 'quay.io/mcp/weather:1.2.0',
      namespace: 'test-project',
    });

    const nsButton = screen.getByTestId('mcp-deploy-namespace-select');
    expect(nsButton).toBeDisabled();
    expect(nsButton).toHaveTextContent('test-project');
  });

  it('should call updateMcpDeployment and close without navigating when saving an existing deployment', async () => {
    mockUpdateMcpDeployment.mockReturnValue(jest.fn().mockResolvedValue(mockDeployment()));
    const onClose = jest.fn();

    renderModal(
      {
        name: 'my-server',
        displayName: 'Weather MCP',
        image: 'quay.io/mcp/weather:1.2.0',
        yaml: '',
        namespace: 'test-project',
      },
      undefined,
      onClose,
    );

    expect(screen.getByTestId('mcp-deploy-modal-title')).toHaveTextContent(
      'Edit MCP server deployment',
    );

    await userEvent.click(screen.getByTestId('modal-submit-button'));

    await waitFor(() => expect(mockUpdateMcpDeployment).toHaveBeenCalled());
    const updateCall = mockUpdateMcpDeployment.mock.results[0].value as jest.Mock;
    expect(updateCall).toHaveBeenCalledWith(
      expect.anything(),
      'my-server',
      expect.objectContaining({
        displayName: 'Weather MCP',
        image: 'quay.io/mcp/weather:1.2.0',
        yaml: '',
      }),
    );

    expect(onClose).toHaveBeenCalledWith(true);
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(mockCreateMcpDeployment).not.toHaveBeenCalled();
  });

  it('should surface an error and keep the modal open when updating an existing deployment fails', async () => {
    mockUpdateMcpDeployment.mockReturnValue(
      jest.fn().mockRejectedValue(new Error('update failed')),
    );
    const onClose = jest.fn();

    renderModal(
      {
        name: 'my-server',
        displayName: 'Weather MCP',
        image: 'quay.io/mcp/weather:1.2.0',
        namespace: 'test-project',
      },
      undefined,
      onClose,
    );

    await userEvent.click(screen.getByTestId('modal-submit-button'));

    await waitFor(() => expect(screen.getByText('update failed')).toBeInTheDocument());
    expect(onClose).not.toHaveBeenCalled();
  });

  it('should call onClose when the Cancel button is clicked', async () => {
    const onClose = jest.fn();
    renderModal({ image: 'quay.io/mcp/weather:1.2.0', serverName: 'weather' }, undefined, onClose);

    await userEvent.click(screen.getByTestId('modal-cancel-button'));

    expect(onClose).toHaveBeenCalledWith();
  });
});
