import '@testing-library/jest-dom';
import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { McpServer } from '~/app/mcpServerCatalogTypes';
import type { MCPServerCR } from '~/odh/types/mcpDeploymentTypes';
import { RHAI_DEPLOY_SPEC_META_KEY } from '~/odh/utils/catalogToRegistry';
import McpRegisterModal from '~/odh/components/McpRegisterModal';

type StubCodeEditorProps = { code: string; onCodeChange: (value: string) => void };

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
jest.mock('~/odh/components/NamespaceSelectorFieldWrapper', () => {
  const StubNamespaceSelectorFieldWrapper: React.FC = () => <div />;
  return StubNamespaceSelectorFieldWrapper;
});
jest.mock('~/odh/components/McpServerIconsField', () => {
  const StubMcpServerIconsField: React.FC = () => <div />;
  return StubMcpServerIconsField;
});
jest.mock('~/odh/components/McpServerTagsField', () => {
  const StubMcpServerTagsField: React.FC = () => <div />;
  return StubMcpServerTagsField;
});
jest.mock('@odh-dashboard/internal/app/ThemeContext', () => ({
  useThemeContext: () => ({ theme: 'light' }),
}));
jest.mock('~/app/hooks/useNotification', () => ({
  useNotification: () => ({ success: jest.fn(), warning: jest.fn(), error: jest.fn() }),
}));
jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useNavigate: () => jest.fn(),
}));

const makeServer = (partial?: Partial<McpServer>): McpServer => ({
  id: '1',
  name: 'kubernetes/mcp-server',
  toolCount: 0,
  ...partial,
});

const makeDeploySpec = (): MCPServerCR['spec'] => ({
  source: { type: 'Image', containerImage: { ref: 'quay.io/example/mcp-server:latest' } },
  config: { port: 8080 },
});

const getEditorContent = (): Record<string, unknown> =>
  JSON.parse((screen.getByTestId('mcp-register-server-json-code') as HTMLTextAreaElement).value);

describe('McpRegisterModal', () => {
  it('includes the deploy-spec _meta block when deploySpec is already available at mount', () => {
    render(
      <McpRegisterModal server={makeServer()} deploySpec={makeDeploySpec()} onClose={jest.fn()} />,
    );

    expect(getEditorContent()._meta).toEqual({ [RHAI_DEPLOY_SPEC_META_KEY]: makeDeploySpec() });
  });

  it('backfills the deploy-spec _meta block once deploySpec arrives after mount', () => {
    const { rerender } = render(
      <McpRegisterModal server={makeServer()} deploySpec={undefined} onClose={jest.fn()} />,
    );

    expect(getEditorContent()._meta).toBeUndefined();

    const deploySpec = makeDeploySpec();
    rerender(
      <McpRegisterModal server={makeServer()} deploySpec={deploySpec} onClose={jest.fn()} />,
    );

    expect(getEditorContent()._meta).toEqual({ [RHAI_DEPLOY_SPEC_META_KEY]: deploySpec });
  });

  it('does not clobber a user edit to server.json when deploySpec arrives later', () => {
    const { rerender } = render(
      <McpRegisterModal server={makeServer()} deploySpec={undefined} onClose={jest.fn()} />,
    );

    const userEditedContent = JSON.stringify({ name: 'custom/name', version: '9.9.9' }, null, 2);
    fireEvent.change(screen.getByTestId('mcp-register-server-json-code'), {
      target: { value: userEditedContent },
    });
    expect(getEditorContent()).toEqual({ name: 'custom/name', version: '9.9.9' });

    rerender(
      <McpRegisterModal server={makeServer()} deploySpec={makeDeploySpec()} onClose={jest.fn()} />,
    );

    expect(getEditorContent()).toEqual({ name: 'custom/name', version: '9.9.9' });
  });
});
