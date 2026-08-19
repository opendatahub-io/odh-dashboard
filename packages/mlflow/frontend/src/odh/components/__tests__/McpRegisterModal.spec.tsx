import '@testing-library/jest-dom';
import * as React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { McpDeploySpec, McpServer } from '~/app/types/mcpCatalogTypes';
import {
  mockMcpDeploySpec,
  mockMcpServer,
  mockMcpServerJson,
  mockMcpTool,
  mockMcpToolList,
} from '~/__mocks__/mockMcpCatalog';
import { mockMcpIcon, mockMcpServerVersion } from '~/__mocks__/mockMcpRegistry';
import {
  CATALOG_SOURCE_ID_TAG_KEY,
  MCP_SERVER_JSON_ERROR,
  REGISTER_NOTIFICATION,
  REGISTER_TOOLS_LOAD_WARNING,
} from '~/odh/const';
import { registerMcpServer } from '~/odh/utils';
import { useMcpServerToolList } from '~/app/hooks/useMcpServerCatalog';
import McpRegisterModal from '~/odh/components/McpRegisterModal';

type StubCodeEditorProps = { code: string; onCodeChange: (value: string) => void };
type StubProjectSelectorProps = { onSelection: (namespace: string) => void };

jest.mock('@patternfly/react-code-editor', () => ({
  CodeEditor: ({ code, onCodeChange }: StubCodeEditorProps) => (
    <textarea
      data-testid="mcp-register-server-json-code"
      value={code}
      onChange={(e) => onCodeChange(e.target.value)}
    />
  ),
  Language: { json: 'json' },
}));
jest.mock(
  '~/odh/components/ProjectSelectorFieldWrapper',
  () =>
    function StubProjectSelector({ onSelection }: StubProjectSelectorProps) {
      return (
        <button
          type="button"
          data-testid="stub-select-namespace"
          onClick={() => onSelection('test-project')}
        >
          Select namespace
        </button>
      );
    },
);
jest.mock('~/odh/components/McpServerIconsField', () => {
  const { useEffect } = jest.requireActual('react');
  return function StubMcpServerIconsField({
    officialIcons = [],
    onStatusChange,
  }: {
    officialIcons?: { src: string }[];
    onStatusChange?: (status: {
      settled: boolean;
      hasBlockingError: boolean;
      iconsForPayload: { src: string }[];
    }) => void;
  }) {
    useEffect(() => {
      onStatusChange?.({
        settled: true,
        hasBlockingError: false,
        iconsForPayload: officialIcons.filter((icon) => icon.src),
      });
    }, [officialIcons, onStatusChange]);
    return <div />;
  };
});
jest.mock(
  '~/odh/components/McpServerTagsField',
  () =>
    function StubMcpServerTagsField({ tags }: { tags: { key: string; value: string }[] }) {
      return (
        <div data-testid="stub-tags">
          {tags.map((tag, i) => (
            <span key={i} data-testid={`stub-tag-${i}`}>
              {`${tag.key}=${tag.value}`}
            </span>
          ))}
        </div>
      );
    },
);
jest.mock('@odh-dashboard/ui-core', () => ({
  useThemeContext: () => ({ theme: 'light' }),
}));

const mockNotificationSuccess = jest.fn();
const mockNotificationWarning = jest.fn();
jest.mock('~/odh/hooks/useNotification', () => ({
  useNotification: () => ({
    success: mockNotificationSuccess,
    warning: mockNotificationWarning,
    error: jest.fn(),
    info: jest.fn(),
  }),
}));

const mockNavigate = jest.fn();
jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useNavigate: () => mockNavigate,
}));

jest.mock('~/odh/utils', () => ({
  ...jest.requireActual('~/odh/utils'),
  registerMcpServer: jest.fn(),
}));
const mockRegisterMcpServer = jest.mocked(registerMcpServer);

jest.mock('~/app/hooks/useMcpServerCatalog');
const mockUseMcpServerToolList = jest.mocked(useMcpServerToolList);

const mockServerWithSourceId = (sourceId: string) =>
  mockMcpServer({
    // eslint-disable-next-line camelcase -- catalog wire key
    source_id: sourceId,
  });

const renderModal = (
  onClose: (saved?: boolean) => void = jest.fn(),
  server: McpServer = mockMcpServer(),
  deploySpec: McpDeploySpec | undefined = mockMcpDeploySpec(),
) =>
  render(
    <McpRegisterModal
      server={server}
      registriesNamespace="test-namespace"
      deploySpec={deploySpec}
      onClose={onClose}
    />,
  );

const changeServerJson = (value: string, { blur } = { blur: false }) => {
  fireEvent.change(screen.getByTestId('mcp-register-server-json-code'), { target: { value } });
  if (blur) {
    fireEvent.blur(screen.getByTestId('mcp-register-server-json-editor'));
  }
};

const getEditorContent = (): Record<string, unknown> =>
  JSON.parse((screen.getByTestId('mcp-register-server-json-code') as HTMLTextAreaElement).value);

const registerContext = expect.objectContaining({
  queryParams: { workspace: 'test-project' },
  opts: expect.objectContaining({ signal: expect.any(AbortSignal) }),
});

describe('McpRegisterModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseMcpServerToolList.mockReturnValue([mockMcpToolList(), true, undefined, jest.fn()]);
  });

  it('should prefill server.json from the server prop', () => {
    const catalogServer = mockMcpServer({
      serverJson: mockMcpServerJson({
        name: 'proxied/server',
        version: '2.0.0',
        description: 'from host',
      }),
    });

    renderModal(jest.fn(), catalogServer);

    expect(getEditorContent()).toEqual({
      name: 'proxied/server',
      version: '2.0.0',
      description: 'from host',
      _meta: {
        'com.redhat/deploy-spec': mockMcpDeploySpec(),
      },
    });
  });

  it('should embed deploy-spec from the deploySpec prop into server.json', () => {
    renderModal(jest.fn(), mockMcpServer(), mockMcpDeploySpec());

    expect(getEditorContent()).toEqual({
      name: 'kubernetes/mcp-server',
      version: '1.0.0',
      _meta: {
        'com.redhat/deploy-spec': mockMcpDeploySpec(),
      },
    });
  });

  it('should keep user edits to server.json across parent rerenders', () => {
    const { rerender } = renderModal();

    const userEditedContent = JSON.stringify({ name: 'custom/name', version: '9.9.9' }, null, 2);
    fireEvent.change(screen.getByTestId('mcp-register-server-json-code'), {
      target: { value: userEditedContent },
    });
    expect(getEditorContent()).toEqual({ name: 'custom/name', version: '9.9.9' });

    // server.json is initialized once; late prop changes (e.g. deploySpec) are not synced.
    rerender(
      <McpRegisterModal
        server={mockMcpServer({
          serverJson: mockMcpServerJson({ name: 'later/server', version: '3.0.0' }),
        })}
        registriesNamespace="test-namespace"
        deploySpec={mockMcpDeploySpec()}
        onClose={jest.fn()}
      />,
    );

    expect(getEditorContent()).toEqual({ name: 'custom/name', version: '9.9.9' });
  });

  it('should prefill catalog.source.id from the catalog server source_id', () => {
    renderModal(jest.fn(), mockServerWithSourceId('community_mcp_servers'));

    expect(screen.getByTestId('stub-tag-0')).toHaveTextContent(
      `${CATALOG_SOURCE_ID_TAG_KEY}=community_mcp_servers`,
    );
  });

  it('should start with an empty tag row when the catalog server has no source_id', () => {
    renderModal();

    expect(screen.getByTestId('stub-tag-0')).toHaveTextContent('=');
  });

  it('should keep Register disabled until a namespace is selected, and enable it once one is', async () => {
    const user = userEvent.setup();
    renderModal();

    expect(screen.getByTestId('modal-submit-button')).toBeDisabled();

    await user.click(screen.getByTestId('stub-select-namespace'));

    expect(screen.getByTestId('modal-submit-button')).toBeEnabled();
  });

  it('should keep Register disabled while the tool list is still loading, even with a namespace selected', async () => {
    mockUseMcpServerToolList.mockReturnValue([mockMcpToolList(), false, undefined, jest.fn()]);
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByTestId('stub-select-namespace'));

    expect(screen.getByTestId('modal-submit-button')).toBeDisabled();
  });

  it('should allow Register once the tool list fails to load, rather than blocking forever', async () => {
    mockUseMcpServerToolList.mockReturnValue([
      mockMcpToolList(),
      false,
      new Error('tools request failed'),
      jest.fn(),
    ]);
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByTestId('stub-select-namespace'));

    expect(screen.getByTestId('modal-submit-button')).toBeEnabled();
    expect(screen.getByTestId('mcp-register-tools-warning')).toHaveTextContent(
      REGISTER_TOOLS_LOAD_WARNING.TITLE,
    );
    expect(screen.getByTestId('mcp-register-tools-warning')).toHaveTextContent(
      REGISTER_TOOLS_LOAD_WARNING.description('tools request failed'),
    );
  });

  it('should register using the tools fetched via useMcpServerToolList', async () => {
    mockUseMcpServerToolList.mockReturnValue([
      mockMcpToolList({
        items: [{ serverId: '1', tool: mockMcpTool({ name: 'list_pods' }) }],
      }),
      true,
      undefined,
      jest.fn(),
    ]);
    mockRegisterMcpServer.mockResolvedValue({ version: mockMcpServerVersion() });
    const user = userEvent.setup();

    renderModal();
    await user.click(screen.getByTestId('stub-select-namespace'));
    await user.click(screen.getByTestId('modal-submit-button'));

    await waitFor(() => expect(mockRegisterMcpServer).toHaveBeenCalled());
    expect(mockRegisterMcpServer).toHaveBeenCalledWith(
      expect.objectContaining({
        tools: [mockMcpTool({ name: 'list_pods' })],
      }),
      registerContext,
    );
  });

  it('should include the prefilled catalog.source.id tag on submit', async () => {
    mockRegisterMcpServer.mockResolvedValue({ version: mockMcpServerVersion() });
    const user = userEvent.setup();

    renderModal(jest.fn(), mockServerWithSourceId('community_mcp_servers'));
    await user.click(screen.getByTestId('stub-select-namespace'));
    await user.click(screen.getByTestId('modal-submit-button'));

    await waitFor(() => expect(mockRegisterMcpServer).toHaveBeenCalled());
    expect(mockRegisterMcpServer).toHaveBeenCalledWith(
      expect.objectContaining({
        tags: [{ key: CATALOG_SOURCE_ID_TAG_KEY, value: 'community_mcp_servers' }],
      }),
      registerContext,
    );
  });

  it('should keep Register disabled when server.json is not valid JSON', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByTestId('stub-select-namespace'));

    changeServerJson('{not valid json');

    expect(screen.getByTestId('modal-submit-button')).toBeDisabled();
    expect(screen.queryByTestId('mcp-register-server-json-error')).not.toBeInTheDocument();

    changeServerJson('{not valid json', { blur: true });

    expect(screen.getByTestId('mcp-register-server-json-error')).toHaveTextContent(
      MCP_SERVER_JSON_ERROR.INVALID_JSON,
    );
  });

  it('should keep Register disabled when server.json has no name', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByTestId('stub-select-namespace'));

    changeServerJson(JSON.stringify({ version: '1.0.0' }), { blur: true });

    expect(screen.getByTestId('modal-submit-button')).toBeDisabled();
    expect(screen.getByTestId('mcp-register-server-json-error')).toHaveTextContent(
      MCP_SERVER_JSON_ERROR.MISSING_NAME,
    );
  });

  it('should keep Register disabled when server.json has no version', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByTestId('stub-select-namespace'));

    changeServerJson(JSON.stringify({ name: 'catalog/my-server' }), { blur: true });

    expect(screen.getByTestId('modal-submit-button')).toBeDisabled();
    expect(screen.getByTestId('mcp-register-server-json-error')).toHaveTextContent(
      MCP_SERVER_JSON_ERROR.MISSING_VERSION,
    );
  });

  it('should keep Register disabled when server.json name is not namespaced', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByTestId('stub-select-namespace'));

    changeServerJson(JSON.stringify({ name: 'my-server', version: '1.0.0' }), { blur: true });

    expect(screen.getByTestId('modal-submit-button')).toBeDisabled();
    expect(screen.getByTestId('mcp-register-server-json-error')).toHaveTextContent(
      MCP_SERVER_JSON_ERROR.INVALID_NAME,
    );
  });

  it('should hide the server.json error while editing after blur', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByTestId('stub-select-namespace'));

    changeServerJson(JSON.stringify({ name: 'my-server', version: '1.0.0' }), { blur: true });
    expect(screen.getByTestId('mcp-register-server-json-error')).toBeInTheDocument();

    changeServerJson(JSON.stringify({ name: 'my-serve', version: '1.0.0' }));
    expect(screen.queryByTestId('mcp-register-server-json-error')).not.toBeInTheDocument();
  });

  it('should enable Register when server.json has a namespaced name and version', async () => {
    const user = userEvent.setup();
    renderModal();
    await user.click(screen.getByTestId('stub-select-namespace'));

    changeServerJson(JSON.stringify({ name: 'catalog/my-server', version: '1.0.0' }), {
      blur: true,
    });

    expect(screen.getByTestId('modal-submit-button')).toBeEnabled();
    expect(screen.queryByTestId('mcp-register-server-json-error')).not.toBeInTheDocument();
  });

  it('should register, notify success, close, and navigate to the new server on submit', async () => {
    const user = userEvent.setup();
    mockRegisterMcpServer.mockResolvedValue({
      version: mockMcpServerVersion({ version: '2.0.0' }),
    });
    const onClose = jest.fn();

    renderModal(onClose, mockMcpServer());
    await user.click(screen.getByTestId('stub-select-namespace'));
    await user.click(screen.getByTestId('modal-submit-button'));

    await waitFor(() => expect(onClose).toHaveBeenCalledWith(true));

    expect(mockRegisterMcpServer).toHaveBeenCalledWith(
      expect.objectContaining({ registryName: 'kubernetes/mcp-server', status: 'draft' }),
      expect.objectContaining({ queryParams: { workspace: 'test-project' } }),
    );
    expect(mockNotificationSuccess).toHaveBeenCalledWith(
      REGISTER_NOTIFICATION.success('kubernetes/mcp-server', '2.0.0'),
    );
    expect(mockNavigate).toHaveBeenCalledWith(
      '/ai-hub/mcp-servers/registry/kubernetes%2Fmcp-server?workspace=test-project',
    );
  });

  it('should send the official catalog logo when the user did not add icons', async () => {
    const user = userEvent.setup();
    mockRegisterMcpServer.mockResolvedValue({ version: mockMcpServerVersion() });

    renderModal(
      undefined,
      mockMcpServer({
        logo: 'https://cdn.example.com/official.svg',
      }),
    );
    await user.click(screen.getByTestId('stub-select-namespace'));
    await user.click(screen.getByTestId('modal-submit-button'));

    await waitFor(() => expect(mockRegisterMcpServer).toHaveBeenCalled());
    expect(mockRegisterMcpServer).toHaveBeenCalledWith(
      expect.objectContaining({
        icons: [mockMcpIcon({ src: 'https://cdn.example.com/official.svg' })],
      }),
      registerContext,
    );
  });

  it('should send data-URI catalog logos as the browser logo endpoint URL', async () => {
    const user = userEvent.setup();
    mockRegisterMcpServer.mockResolvedValue({ version: mockMcpServerVersion() });

    renderModal(
      undefined,
      mockMcpServer({
        id: '11',
        logo: 'data:image/png;base64,abc',
      }),
    );
    await user.click(screen.getByTestId('stub-select-namespace'));
    await user.click(screen.getByTestId('modal-submit-button'));

    await waitFor(() => expect(mockRegisterMcpServer).toHaveBeenCalled());
    expect(mockRegisterMcpServer).toHaveBeenCalledWith(
      expect.objectContaining({
        icons: [
          expect.objectContaining({
            src: expect.stringMatching(
              /\/model-registry\/api\/v1\/mcp_catalog\/mcp_servers\/11\/logo\?namespace=/,
            ),
          }),
        ],
      }),
      registerContext,
    );
  });

  it('should surface a metadataError as a warning notification without blocking success', async () => {
    const user = userEvent.setup();
    mockRegisterMcpServer.mockResolvedValue({
      version: mockMcpServerVersion(),
      metadataError: new Error('icons PATCH failed'),
    });

    renderModal(jest.fn(), mockMcpServer());
    await user.click(screen.getByTestId('stub-select-namespace'));
    await user.click(screen.getByTestId('modal-submit-button'));

    await waitFor(() =>
      expect(mockNotificationWarning).toHaveBeenCalledWith(
        REGISTER_NOTIFICATION.METADATA_NOT_SAVED,
        'icons PATCH failed',
      ),
    );
  });

  it('should surface a tagsError as a warning notification without blocking success', async () => {
    const user = userEvent.setup();
    mockRegisterMcpServer.mockResolvedValue({
      version: mockMcpServerVersion(),
      tagsError: new Error('Failed to set tags: team'),
    });

    renderModal(jest.fn(), mockMcpServer());
    await user.click(screen.getByTestId('stub-select-namespace'));
    await user.click(screen.getByTestId('modal-submit-button'));

    await waitFor(() =>
      expect(mockNotificationWarning).toHaveBeenCalledWith(
        REGISTER_NOTIFICATION.TAGS_NOT_SAVED,
        'Failed to set tags: team',
      ),
    );
  });

  it('should show an inline error and keep the modal open when registerMcpServer rejects', async () => {
    const user = userEvent.setup();
    mockRegisterMcpServer.mockRejectedValue(new Error('network error'));
    const onClose = jest.fn();

    renderModal(onClose, mockMcpServer());
    await user.click(screen.getByTestId('stub-select-namespace'));
    await user.click(screen.getByTestId('modal-submit-button'));

    expect(await screen.findByTestId('error-message-alert')).toHaveTextContent('network error');
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByTestId('modal-submit-button')).toBeEnabled();
  });

  it('should abort the in-flight register request when the modal unmounts', async () => {
    const user = userEvent.setup();
    let capturedSignal: AbortSignal | undefined;
    mockRegisterMcpServer.mockImplementation(
      (_input, context) =>
        new Promise(() => {
          capturedSignal = context.opts.signal;
        }),
    );

    const { unmount } = renderModal(jest.fn(), mockMcpServer());
    await user.click(screen.getByTestId('stub-select-namespace'));
    await user.click(screen.getByTestId('modal-submit-button'));

    expect(capturedSignal?.aborted).toBe(false);

    unmount();

    expect(capturedSignal?.aborted).toBe(true);
  });

  it('should not show a failure alert when the register request is aborted', async () => {
    const user = userEvent.setup();
    mockRegisterMcpServer.mockRejectedValue(
      Object.assign(new Error('aborted'), { name: 'AbortError' }),
    );
    const onClose = jest.fn();

    renderModal(onClose, mockMcpServer());
    await user.click(screen.getByTestId('stub-select-namespace'));
    await user.click(screen.getByTestId('modal-submit-button'));

    await waitFor(() => expect(mockRegisterMcpServer).toHaveBeenCalled());
    expect(screen.queryByTestId('error-message-alert')).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
