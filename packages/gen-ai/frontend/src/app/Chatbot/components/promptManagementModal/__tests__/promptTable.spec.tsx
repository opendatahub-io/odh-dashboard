/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MLflowPrompt, MLflowPromptVersion } from '~/app/types';
import PromptTable from '../promptTable';

jest.mock('~/app/utilities/const', () => ({
  URL_PREFIX: '/gen-ai',
  DEPLOYMENT_MODE: 'federated',
  MCP_SERVERS_SESSION_STORAGE_KEY: 'gen-ai-playground-servers',
}));

const mockPrompts: MLflowPrompt[] = [
  {
    name: 'test-prompt-1',
    description: 'A test prompt',
    latest_version: 2,
    tags: { env: 'dev' },
    creation_timestamp: '2024-01-15T10:00:00Z',
  },
  {
    name: 'test-prompt-2',
    description: 'Another test prompt',
    latest_version: 1,
    tags: {},
    creation_timestamp: '2024-01-10T08:00:00Z',
  },
];

const mockVersions: MLflowPromptVersion[] = [
  {
    name: 'test-prompt-1',
    version: 2,
    template: 'You are a helpful assistant.',
    commit_message: 'Updated prompt',
    tags: { env: 'dev' },
    created_at: '2024-01-15T10:00:00Z',
    updated_at: '2024-01-15T10:00:00Z',
  },
];

const mockUsePromptsList = jest.fn();
const mockUsePromptVersions = jest.fn();

jest.mock('../usePromptQueries', () => ({
  usePromptsList: () => mockUsePromptsList(),
  usePromptVersions: () => mockUsePromptVersions(),
}));

describe('PromptTable', () => {
  const defaultProps = {
    onClickLoad: jest.fn(),
    onClose: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePromptVersions.mockReturnValue({
      versions: [],
      isLoading: false,
      error: null,
    });
  });

  it('should render loading spinner when fetching prompts', () => {
    mockUsePromptsList.mockReturnValue({
      prompts: [],
      isLoading: true,
      error: null,
    });

    render(<PromptTable {...defaultProps} />);

    expect(screen.getByLabelText('Loading prompts')).toBeInTheDocument();
  });

  it('should render error state when API fails', () => {
    mockUsePromptsList.mockReturnValue({
      prompts: [],
      isLoading: false,
      error: new Error('Network error occurred'),
    });

    render(<PromptTable {...defaultProps} />);

    expect(screen.getByText('Unable to load prompts')).toBeInTheDocument();
    expect(screen.getByText('Network error occurred')).toBeInTheDocument();
  });

  it('should render empty state when no prompts exist', () => {
    mockUsePromptsList.mockReturnValue({
      prompts: [],
      isLoading: false,
      error: null,
    });

    render(<PromptTable {...defaultProps} />);

    expect(screen.getByText('No prompts found')).toBeInTheDocument();
    expect(screen.getByText('No saved prompts are available in this project.')).toBeInTheDocument();
  });

  it('should render table with prompts when data is loaded', () => {
    mockUsePromptsList.mockReturnValue({
      prompts: mockPrompts,
      isLoading: false,
      error: null,
    });

    render(<PromptTable {...defaultProps} />);

    expect(screen.getByText('test-prompt-1')).toBeInTheDocument();
    expect(screen.getByText('test-prompt-2')).toBeInTheDocument();
    expect(screen.getByRole('grid', { name: 'Paginated Table' })).toBeInTheDocument();
  });

  it('should render table column headers', () => {
    mockUsePromptsList.mockReturnValue({
      prompts: mockPrompts,
      isLoading: false,
      error: null,
    });

    render(<PromptTable {...defaultProps} />);

    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Version' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Last Modified' })).toBeInTheDocument();
    expect(screen.getByRole('columnheader', { name: 'Tags' })).toBeInTheDocument();
  });

  it('should call onClose when Cancel button is clicked', () => {
    mockUsePromptsList.mockReturnValue({
      prompts: mockPrompts,
      isLoading: false,
      error: null,
    });

    render(<PromptTable {...defaultProps} />);

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(defaultProps.onClose).toHaveBeenCalledTimes(1);
  });

  it('should select row when clicked', () => {
    mockUsePromptsList.mockReturnValue({
      prompts: mockPrompts,
      isLoading: false,
      error: null,
    });

    render(<PromptTable {...defaultProps} />);

    const row = screen.getByRole('row', { name: /test-prompt-1/ });
    fireEvent.click(row);

    expect(row).toHaveAttribute('class', expect.stringContaining('pf-m-clickable'));
  });

  it('should call onClickLoad when Load button is clicked with selected version', () => {
    mockUsePromptsList.mockReturnValue({
      prompts: mockPrompts,
      isLoading: false,
      error: null,
    });
    mockUsePromptVersions.mockReturnValue({
      versions: mockVersions,
      isLoading: false,
      error: null,
    });

    render(<PromptTable {...defaultProps} />);

    const row = screen.getByRole('row', { name: /test-prompt-1/ });
    fireEvent.click(row);

    fireEvent.click(screen.getByRole('button', { name: 'Load in Playground' }));

    expect(defaultProps.onClickLoad).toHaveBeenCalledWith(mockVersions[0]);
  });

  it('should show loading state in Load button when fetching version details', () => {
    mockUsePromptsList.mockReturnValue({
      prompts: mockPrompts,
      isLoading: false,
      error: null,
    });
    mockUsePromptVersions.mockReturnValue({
      versions: [],
      isLoading: true,
      error: null,
    });

    render(<PromptTable {...defaultProps} />);

    const row = screen.getByRole('row', { name: /test-prompt-1/ });
    fireEvent.click(row);

    const loadButton = screen.getByRole('button', { name: /Loading/ });
    expect(within(loadButton).getByLabelText('Loading prompt details')).toBeInTheDocument();
  });
});
