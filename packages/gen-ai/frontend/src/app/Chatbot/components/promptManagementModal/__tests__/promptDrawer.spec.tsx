/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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

const mockProjectVersion: MLflowPromptVersion = {
  name: 'project-prompt',
  version: 1,
  template: 'You are a helpful assistant.',
  commit_message: 'Initial version',
  tags: { env: 'dev' },
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
  scope: { type: 'project', namespace: 'my-project' },
};

const mockGlobalVersion: MLflowPromptVersion = {
  name: 'global-prompt',
  version: 1,
  template: 'You are a starter template.',
  commit_message: 'Template created',
  tags: { template: 'starter' },
  created_at: '2024-01-20T12:00:00Z',
  updated_at: '2024-01-20T12:00:00Z',
  scope: { type: 'global', namespace: 'rhoai-templates', read_only: true },
};

const mockGlobalEditableVersion: MLflowPromptVersion = {
  name: 'global-editable-prompt',
  version: 1,
  template: 'You are an editable global template.',
  commit_message: 'Editable template',
  tags: {},
  created_at: '2024-01-20T12:00:00Z',
  updated_at: '2024-01-20T12:00:00Z',
  scope: { type: 'global', namespace: 'shared-team-prompts', read_only: false },
};

const mockVersionWithoutScope: MLflowPromptVersion = {
  name: 'legacy-prompt',
  version: 1,
  template: 'Legacy prompt without scope',
  commit_message: 'Legacy',
  tags: {},
  created_at: '2024-01-01T08:00:00Z',
  updated_at: '2024-01-01T08:00:00Z',
};

describe('PromptDrawer', () => {
  const defaultProps = {
    isLoadingDetails: false,
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

    expect(screen.getByLabelText('prompt template')).toHaveValue('You are a helpful assistant.');
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

    const toggle = screen.getByTestId('prompt-version-select');
    expect(toggle).toHaveTextContent('Version 2');

    fireEvent.click(toggle);

    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(2);
    expect(options[0]).toHaveTextContent('Version 2');
    expect(options[1]).toHaveTextContent('Version 1');

    expect(screen.getByRole('option', { name: 'Version 2' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('option', { name: 'Version 1' })).not.toHaveAttribute(
      'aria-selected',
      'true',
    );
  });

  it('should render clear selection button in drawer', () => {
    render(<PromptDrawer {...defaultProps} selectedVersion={2} />);

    expect(screen.getByRole('button', { name: 'Clear selection' })).toBeInTheDocument();
  });
});

describe('PromptDrawer - Namespace Display', () => {
  const defaultProps = {
    isLoadingDetails: false,
    selectedPromptVersions: [mockProjectVersion],
    selectedVersion: null as number | null,
    onVersionChange: jest.fn(),
    onClose: jest.fn(),
    children: <div data-testid="table-content">Table content</div>,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Namespace field', () => {
    it('should display namespace field for project prompts', () => {
      render(
        <PromptDrawer
          {...defaultProps}
          selectedPromptVersions={[mockProjectVersion]}
          selectedVersion={1}
        />,
      );

      expect(screen.getByText('Namespace:')).toBeInTheDocument();
      expect(screen.getByTestId('prompt-namespace-field')).toHaveTextContent('my-project');
    });

    it('should display namespace field for global prompts', () => {
      render(
        <PromptDrawer
          {...defaultProps}
          selectedPromptVersions={[mockGlobalVersion]}
          selectedVersion={1}
        />,
      );

      expect(screen.getByText(/Namespace:/)).toBeInTheDocument();
      expect(screen.getByTestId('prompt-namespace-field')).toHaveTextContent('rhoai-templates');
    });

    it('should display Unknown when scope is missing', () => {
      render(
        <PromptDrawer
          {...defaultProps}
          selectedPromptVersions={[mockVersionWithoutScope]}
          selectedVersion={1}
        />,
      );

      expect(screen.getByText('Namespace:')).toBeInTheDocument();
      expect(screen.getByTestId('prompt-namespace-field')).toHaveTextContent('Unknown');
    });

    it('should render namespace as plain text not input field', () => {
      render(
        <PromptDrawer
          {...defaultProps}
          selectedPromptVersions={[mockProjectVersion]}
          selectedVersion={1}
        />,
      );

      const namespaceField = screen.getByTestId('prompt-namespace-field');
      expect(namespaceField.tagName).not.toBe('INPUT');
      expect(namespaceField.tagName).toBe('DD');
    });

    it('should appear immediately above Tags field', () => {
      render(
        <PromptDrawer
          {...defaultProps}
          selectedPromptVersions={[mockProjectVersion]}
          selectedVersion={1}
        />,
      );

      const descriptionTerms = screen.getAllByRole('term');
      const namespaceIndex = descriptionTerms.findIndex((term) =>
        term.textContent.includes('Namespace:'),
      );
      const tagsIndex = descriptionTerms.findIndex((term) => term.textContent.includes('Tags:'));

      expect(namespaceIndex).toBeGreaterThan(-1);
      expect(tagsIndex).toBeGreaterThan(-1);
      expect(tagsIndex - namespaceIndex).toBe(1);
    });
  });

  describe('Read-only indicator for global prompts', () => {
    it('should show read-only indicator for global prompts', () => {
      render(
        <PromptDrawer
          {...defaultProps}
          selectedPromptVersions={[mockGlobalVersion]}
          selectedVersion={1}
        />,
      );

      expect(screen.getByText(/\(read-only\)/)).toBeInTheDocument();
    });

    it('should not show read-only indicator for project prompts', () => {
      render(
        <PromptDrawer
          {...defaultProps}
          selectedPromptVersions={[mockProjectVersion]}
          selectedVersion={1}
        />,
      );

      expect(screen.queryByText('(read-only)')).not.toBeInTheDocument();
    });

    it('should not show read-only indicator for global prompt with read_only false', () => {
      render(
        <PromptDrawer
          {...defaultProps}
          selectedPromptVersions={[mockGlobalEditableVersion]}
          selectedVersion={1}
        />,
      );

      expect(screen.queryByText('(read-only)')).not.toBeInTheDocument();
    });

    it('should not show read-only indicator when scope is missing', () => {
      render(
        <PromptDrawer
          {...defaultProps}
          selectedPromptVersions={[mockVersionWithoutScope]}
          selectedVersion={1}
        />,
      );

      expect(screen.queryByText('(read-only)')).not.toBeInTheDocument();
    });
  });

  describe('Multiple namespaces', () => {
    const multipleVersions: MLflowPromptVersion[] = [
      {
        ...mockProjectVersion,
        version: 2,
        scope: { type: 'project', namespace: 'project-a' },
      },
      {
        ...mockGlobalVersion,
        version: 1,
        scope: { type: 'global', namespace: 'namespace-1', read_only: true },
      },
    ];

    it('should display correct namespace when switching versions', () => {
      const { rerender } = render(
        <PromptDrawer
          {...defaultProps}
          selectedPromptVersions={multipleVersions}
          selectedVersion={2}
        />,
      );

      expect(screen.getByTestId('prompt-namespace-field')).toHaveTextContent('project-a');
      expect(screen.queryByText('(read-only)')).not.toBeInTheDocument();

      rerender(
        <PromptDrawer
          {...defaultProps}
          selectedPromptVersions={multipleVersions}
          selectedVersion={1}
        />,
      );

      expect(screen.getByTestId('prompt-namespace-field')).toHaveTextContent('namespace-1');
      expect(screen.getByText(/\(read-only\)/)).toBeInTheDocument();
    });
  });
});
