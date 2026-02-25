/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { MLflowPromptVersion } from '~/app/types';
import PromptDrawer from '~/app/Chatbot/components/promptManagementModal/promptDrawer';

jest.mock('~/app/utilities/const', () => ({
  URL_PREFIX: '/gen-ai',
  DEPLOYMENT_MODE: 'federated',
  MCP_SERVERS_SESSION_STORAGE_KEY: 'gen-ai-playground-servers',
}));

const mockVersions: MLflowPromptVersion[] = [
  {
    name: 'test-prompt',
    version: 2,
    template: 'You are a helpful assistant.',
    commit_message: 'Updated prompt',
    tags: { env: 'dev', category: 'chat' },
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T12:00:00Z',
  },
  {
    name: 'test-prompt',
    version: 1,
    template: 'You are an assistant.',
    commit_message: 'Initial version',
    tags: {},
    created_at: '2024-01-10T08:00:00Z',
    updated_at: '2024-01-10T08:00:00Z',
  },
];

describe('PromptDrawer', () => {
  const defaultProps = {
    selectedPromptVersions: mockVersions,
    selectedVersion: null as number | null,
    onVersionChange: jest.fn(),
    onClose: jest.fn(),
    children: <div data-testid="table-content">Table content</div>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render children content', () => {
    render(<PromptDrawer {...defaultProps} />);

    expect(screen.getByTestId('table-content')).toBeInTheDocument();
  });

  it('should not render drawer panel when no version is selected', () => {
    render(<PromptDrawer {...defaultProps} selectedVersion={null} />);

    expect(screen.queryByRole('heading', { name: 'test-prompt' })).not.toBeInTheDocument();
  });

  it('should render drawer panel when a version is selected', () => {
    render(<PromptDrawer {...defaultProps} selectedVersion={2} />);

    expect(screen.getByRole('heading', { name: 'test-prompt' })).toBeInTheDocument();
  });

  it('should display prompt template in text area', () => {
    render(<PromptDrawer {...defaultProps} selectedVersion={2} />);

    expect(screen.getByLabelText('prompt template')).toHaveValue(
      JSON.stringify('You are a helpful assistant.', null, 2),
    );
  });

  it('should display commit message', () => {
    render(<PromptDrawer {...defaultProps} selectedVersion={2} />);

    expect(screen.getByText('Commit Message:')).toBeInTheDocument();
    expect(screen.getByText('Updated prompt')).toBeInTheDocument();
  });

  it('should display tags when present', () => {
    render(<PromptDrawer {...defaultProps} selectedVersion={2} />);

    expect(screen.getByText('Tags:')).toBeInTheDocument();
    expect(screen.getByText('env: dev')).toBeInTheDocument();
    expect(screen.getByText('category: chat')).toBeInTheDocument();
  });

  it('should render version selector with correct options', () => {
    render(<PromptDrawer {...defaultProps} selectedVersion={2} />);

    expect(screen.getByRole('button', { name: 'Version 2' })).toBeInTheDocument();
  });

  it('should render close button in drawer', () => {
    render(<PromptDrawer {...defaultProps} selectedVersion={2} />);

    expect(screen.getByRole('button', { name: 'Close drawer panel' })).toBeInTheDocument();
  });
});
