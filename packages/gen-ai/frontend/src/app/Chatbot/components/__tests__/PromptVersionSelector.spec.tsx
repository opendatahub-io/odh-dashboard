/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PromptVersionSelector from '~/app/Chatbot/components/PromptVersionSelector';
import { MLflowPromptVersion } from '~/app/types';

jest.mock('~/app/utilities/const', () => ({
  URL_PREFIX: '/gen-ai',
  DEPLOYMENT_MODE: 'federated',
  MCP_SERVERS_SESSION_STORAGE_KEY: 'gen-ai-playground-servers',
}));

const mockVersions: MLflowPromptVersion[] = [
  {
    name: 'test-prompt',
    version: 3,
    template: 'Version 3 template',
    commit_message: 'v3',
    tags: {},
    created_at: '2024-03-01T10:00:00Z',
    updated_at: '2024-03-01T10:00:00Z',
  },
  {
    name: 'test-prompt',
    version: 2,
    template: 'Version 2 template',
    commit_message: 'v2',
    tags: {},
    created_at: '2024-02-01T10:00:00Z',
    updated_at: '2024-02-01T10:00:00Z',
  },
  {
    name: 'test-prompt',
    version: 1,
    template: 'Version 1 template',
    commit_message: 'v1',
    tags: {},
    created_at: '2024-01-01T10:00:00Z',
    updated_at: '2024-01-01T10:00:00Z',
  },
];

const mockUsePromptVersions = jest.fn();

jest.mock('~/app/Chatbot/components/promptManagementModal/usePromptQueries', () => ({
  usePromptVersions: (...args: unknown[]) => mockUsePromptVersions(...args),
}));

jest.mock('@odh-dashboard/internal/routes/pipelines/mlflow', () => ({
  mlflowPromptManagementBaseRoute: (ns?: string) =>
    ns ? `/gen-ai-studio/prompts?workspace=${ns}` : '/gen-ai-studio/prompts',
}));

function renderSelector(props: Partial<React.ComponentProps<typeof PromptVersionSelector>> = {}) {
  const defaultProps: React.ComponentProps<typeof PromptVersionSelector> = {
    promptName: 'test-prompt',
    currentVersion: 3,
    onVersionSelect: jest.fn(),
    namespace: 'test-ns',
  };
  return render(
    <MemoryRouter>
      <PromptVersionSelector {...defaultProps} {...props} />
    </MemoryRouter>,
  );
}

describe('PromptVersionSelector', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePromptVersions.mockReturnValue({
      versions: mockVersions,
      isLoading: false,
      error: null,
    });
  });

  it('renders toggle with current version', () => {
    renderSelector();
    expect(screen.getByTestId('prompt-version-toggle')).toHaveTextContent('Version 3');
  });

  it('opens dropdown and shows all versions', () => {
    renderSelector();

    fireEvent.click(screen.getByTestId('prompt-version-toggle'));

    expect(screen.getByTestId('prompt-version-item-3')).toBeInTheDocument();
    expect(screen.getByTestId('prompt-version-item-2')).toBeInTheDocument();
    expect(screen.getByTestId('prompt-version-item-1')).toBeInTheDocument();
  });

  it('shows Latest badge on the most recent version in the menu', () => {
    renderSelector();

    fireEvent.click(screen.getByTestId('prompt-version-toggle'));

    const item3 = screen.getByTestId('prompt-version-item-3');
    expect(item3).toHaveTextContent('Latest');

    const item2 = screen.getByTestId('prompt-version-item-2');
    expect(item2).not.toHaveTextContent('Latest');
  });

  it('shows Latest badge in toggle when expanded and current version is latest', () => {
    renderSelector({ currentVersion: 3 });

    const toggle = screen.getByTestId('prompt-version-toggle');
    expect(toggle).not.toHaveTextContent('Latest');

    fireEvent.click(toggle);
    expect(screen.getByTestId('prompt-version-toggle')).toHaveTextContent('Latest');
  });

  it('does not show Latest badge in toggle when current version is not latest', () => {
    renderSelector({ currentVersion: 2 });

    fireEvent.click(screen.getByTestId('prompt-version-toggle'));
    expect(screen.getByTestId('prompt-version-toggle')).not.toHaveTextContent('Latest');
  });

  it('calls onVersionSelect when a different version is selected', () => {
    const onVersionSelect = jest.fn();
    renderSelector({ currentVersion: 3, onVersionSelect });

    fireEvent.click(screen.getByTestId('prompt-version-toggle'));

    const item2 = screen.getByTestId('prompt-version-item-2');
    const button = within(item2).getByRole('menuitem');
    fireEvent.click(button);

    expect(onVersionSelect).toHaveBeenCalledWith(mockVersions[1]);
  });

  it('does not call onVersionSelect when the same version is selected', () => {
    const onVersionSelect = jest.fn();
    renderSelector({ currentVersion: 3, onVersionSelect });

    fireEvent.click(screen.getByTestId('prompt-version-toggle'));

    const item3 = screen.getByTestId('prompt-version-item-3');
    const button = within(item3).getByRole('menuitem');
    fireEvent.click(button);

    expect(onVersionSelect).not.toHaveBeenCalled();
  });

  it('renders "View all N versions" link with correct count', () => {
    renderSelector();

    fireEvent.click(screen.getByTestId('prompt-version-toggle'));

    const viewAllLink = screen.getByTestId('prompt-view-all-versions');
    expect(viewAllLink).toHaveTextContent('View all 3 versions');
  });

  it('renders "View all" link with workspace in href', () => {
    renderSelector({ namespace: 'my-project' });

    fireEvent.click(screen.getByTestId('prompt-version-toggle'));

    const link = screen.getByTestId('prompt-view-all-versions').closest('a');
    expect(link).toHaveAttribute('href', '/gen-ai-studio/prompts?workspace=my-project');
  });

  it('shows loading spinner when versions are loading', () => {
    mockUsePromptVersions.mockReturnValue({
      versions: [],
      isLoading: true,
      error: null,
    });
    renderSelector();

    expect(screen.getByLabelText('Loading versions')).toBeInTheDocument();
  });

  it('does not show loading spinner when versions are loaded', () => {
    renderSelector();
    expect(screen.queryByLabelText('Loading versions')).not.toBeInTheDocument();
  });

  it('renders search placeholder text', () => {
    renderSelector();

    fireEvent.click(screen.getByTestId('prompt-version-toggle'));

    expect(screen.getByPlaceholderText('Find by version name')).toBeInTheDocument();
  });

  it('passes scope to usePromptVersions', () => {
    const scope = { type: 'global' as const, namespace: 'rhoai-templates' };
    renderSelector({ promptScope: scope });

    expect(mockUsePromptVersions).toHaveBeenCalledWith('test-prompt', scope);
  });

  it('renders with size sm toggle', () => {
    renderSelector();

    const toggle = screen.getByTestId('prompt-version-toggle');
    expect(toggle).toHaveClass('pf-m-small');
  });

  it('renders error state when usePromptVersions returns an error', () => {
    mockUsePromptVersions.mockReturnValue({
      versions: [],
      isLoading: false,
      error: new Error('Network failure'),
    });
    renderSelector();

    fireEvent.click(screen.getByTestId('prompt-version-toggle'));

    expect(screen.getByTestId('prompt-version-error')).toHaveTextContent('Unable to load versions');
  });

  it('applies danger status to the toggle when there is an error', () => {
    mockUsePromptVersions.mockReturnValue({
      versions: [],
      isLoading: false,
      error: new Error('API failure'),
    });
    renderSelector();

    expect(screen.getByTestId('prompt-version-toggle')).toHaveClass('pf-m-danger');
  });

  it('filters out malformed versions with missing name or version', () => {
    mockUsePromptVersions.mockReturnValue({
      versions: [
        ...mockVersions,
        { version: 4, template: 'no name field' } as unknown as MLflowPromptVersion,
        { name: 'test', template: 'no version field' } as unknown as MLflowPromptVersion,
      ],
      isLoading: false,
      error: null,
    });
    renderSelector({ currentVersion: 3 });

    fireEvent.click(screen.getByTestId('prompt-version-toggle'));

    expect(screen.getByTestId('prompt-version-item-3')).toBeInTheDocument();
    expect(screen.getByTestId('prompt-version-item-2')).toBeInTheDocument();
    expect(screen.getByTestId('prompt-version-item-1')).toBeInTheDocument();
    expect(screen.queryByTestId('prompt-version-item-4')).not.toBeInTheDocument();
  });

  it('filters out versions with null entries in messages array', () => {
    mockUsePromptVersions.mockReturnValue({
      versions: [
        {
          name: 'test-prompt',
          version: 5,
          messages: [null, { role: 'system', content: 'hello' }],
          tags: {},
          created_at: '2024-04-01T10:00:00Z',
          updated_at: '2024-04-01T10:00:00Z',
        } as unknown as MLflowPromptVersion,
        ...mockVersions,
      ],
      isLoading: false,
      error: null,
    });
    renderSelector({ currentVersion: 3 });

    fireEvent.click(screen.getByTestId('prompt-version-toggle'));

    expect(screen.queryByTestId('prompt-version-item-5')).not.toBeInTheDocument();
    expect(screen.getByTestId('prompt-version-item-3')).toBeInTheDocument();
  });
});
