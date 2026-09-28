import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MCPServer } from '~/app/types';
import MCPServerTableRow from '~/app/AIAssets/components/mcp/MCPServerTableRow';

jest.mock('../MCPServerStatus', () => ({
  __esModule: true,
  default: ({ status }: { status: string }) => <span data-testid="mcp-status">{status}</span>,
}));

jest.mock('../MCPServerEndpointPopover', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

jest.mock('mod-arch-shared', () => ({
  ...jest.requireActual('mod-arch-shared'),
  CheckboxTd: ({ id }: { id: string }) => <td data-testid={`checkbox-${id}`} />,
  TruncatedText: ({ content }: { content: string }) => <span>{content}</span>,
}));

const baseServer: MCPServer = {
  id: 'https://example.com/mcp',
  name: 'Test Server',
  description: 'A test MCP server',
  status: 'active',
  endpoint: 'View',
  connectionUrl: 'https://example.com/mcp',
  tools: 3,
  version: '2.1.0',
  source: 'configmap',
  logo: null,
};

const renderRow = (server: MCPServer) =>
  render(
    <table>
      <tbody>
        <MCPServerTableRow server={server} isChecked={false} onToggleCheck={jest.fn()} />
      </tbody>
    </table>,
  );

describe('MCPServerTableRow', () => {
  it('renders "Manual" for configmap source', () => {
    renderRow(baseServer);
    expect(screen.getByText('Manual')).toBeInTheDocument();
  });

  it('renders "Registered" for registry source', () => {
    renderRow({ ...baseServer, source: 'registry' });
    expect(screen.getByText('Registered')).toBeInTheDocument();
  });

  it('passes through unknown source values unchanged', () => {
    renderRow({ ...baseServer, source: 'custom-origin' });
    expect(screen.getByText('custom-origin')).toBeInTheDocument();
  });

  it('renders the version string', () => {
    renderRow(baseServer);
    expect(screen.getByText('2.1.0')).toBeInTheDocument();
  });

  it('renders dash for empty version', () => {
    renderRow({ ...baseServer, version: '-' });
    expect(screen.getByText('-')).toBeInTheDocument();
  });
});
