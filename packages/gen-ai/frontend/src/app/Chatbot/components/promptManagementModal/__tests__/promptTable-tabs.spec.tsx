/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MLflowPrompt } from '~/app/types';
import PromptTable from '~/app/Chatbot/components/promptManagementModal/promptTable';

jest.mock('~/app/utilities/const', () => ({
  URL_PREFIX: '/gen-ai',
  DEPLOYMENT_MODE: 'federated',
  MCP_SERVERS_SESSION_STORAGE_KEY: 'gen-ai-playground-servers',
}));

const mockProjectPrompts: MLflowPrompt[] = Array.from({ length: 12 }, (_, i) => ({
  name: `project-prompt-${i + 1}`,
  description: `Project prompt ${i + 1}`,
  latest_version: i + 1,
  tags: i % 2 === 0 ? { env: 'dev' } : {},
  creation_timestamp: `2024-01-${String(i + 1).padStart(2, '0')}T10:00:00Z`,
  scope: { type: 'project', namespace: 'my-project' },
}));

const mockGlobalPrompts: MLflowPrompt[] = Array.from({ length: 12 }, (_, i) => ({
  name: `global-prompt-${i + 1}`,
  description: `Global prompt ${i + 1}`,
  latest_version: i + 1,
  tags: i % 2 === 0 ? { template: 'starter' } : {},
  creation_timestamp: `2024-01-${String(i + 1).padStart(2, '0')}T12:00:00Z`,
  scope: { type: 'global', namespace: 'rhoai-templates' },
}));

const mockMixedPrompts = [...mockProjectPrompts, ...mockGlobalPrompts];

const mockUsePromptsList = jest.fn();
const mockUsePromptVersions = jest.fn();

jest.mock('~/app/Chatbot/components/promptManagementModal/usePromptQueries', () => ({
  usePromptsList: () => mockUsePromptsList(),
  usePromptVersions: (promptName: string | null) => mockUsePromptVersions(promptName),
}));

describe('PromptTable - Tab Navigation', () => {
  const defaultProps = {
    onClickLoad: jest.fn(),
    onClose: jest.fn(),
    displayText: {
      title: 'Load prompt',
      description: 'Select a prompt to load into the playground.',
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePromptVersions.mockReturnValue({
      versions: [],
      isLoading: false,
      error: null,
    });
  });

  describe('Tab rendering', () => {
    it('should render Project prompts and Global prompts tabs', () => {
      mockUsePromptsList.mockReturnValue({
        prompts: mockMixedPrompts,
        isLoading: false,
        isFetchingNextPage: false,
        fetchNextPage: jest.fn(),
        error: null,
      });

      render(<PromptTable {...defaultProps} />);

      expect(screen.getByTestId('project-prompts-tab')).toBeInTheDocument();
      expect(screen.getByTestId('global-prompts-tab')).toBeInTheDocument();
    });

    it('should have Project prompts tab selected by default', () => {
      mockUsePromptsList.mockReturnValue({
        prompts: mockMixedPrompts,
        isLoading: false,
        isFetchingNextPage: false,
        fetchNextPage: jest.fn(),
        error: null,
      });

      render(<PromptTable {...defaultProps} />);

      const projectTab = screen.getByTestId('project-prompts-tab');
      expect(projectTab).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Tab filtering', () => {
    it('should show only project prompts in Project prompts tab', () => {
      mockUsePromptsList.mockReturnValue({
        prompts: mockMixedPrompts,
        isLoading: false,
        isFetchingNextPage: false,
        fetchNextPage: jest.fn(),
        error: null,
      });

      render(<PromptTable {...defaultProps} />);

      expect(screen.getByText('project-prompt-1')).toBeInTheDocument();
      expect(screen.getByText('project-prompt-2')).toBeInTheDocument();
      expect(screen.queryByText('global-prompt-1')).not.toBeInTheDocument();
      expect(screen.queryByText('global-prompt-2')).not.toBeInTheDocument();
    });

    it('should show only global prompts in Global prompts tab', () => {
      mockUsePromptsList.mockReturnValue({
        prompts: mockMixedPrompts,
        isLoading: false,
        isFetchingNextPage: false,
        fetchNextPage: jest.fn(),
        error: null,
      });

      render(<PromptTable {...defaultProps} />);

      const globalTab = screen.getByTestId('global-prompts-tab');
      fireEvent.click(globalTab);

      expect(screen.getByText('global-prompt-1')).toBeInTheDocument();
      expect(screen.getByText('global-prompt-2')).toBeInTheDocument();
      expect(screen.queryByText('project-prompt-1')).not.toBeInTheDocument();
      expect(screen.queryByText('project-prompt-2')).not.toBeInTheDocument();
    });

    it('should switch between tabs correctly', () => {
      mockUsePromptsList.mockReturnValue({
        prompts: mockMixedPrompts,
        isLoading: false,
        isFetchingNextPage: false,
        fetchNextPage: jest.fn(),
        error: null,
      });

      render(<PromptTable {...defaultProps} />);

      expect(screen.getByText('project-prompt-1')).toBeInTheDocument();

      const globalTab = screen.getByTestId('global-prompts-tab');
      fireEvent.click(globalTab);
      expect(screen.getByText('global-prompt-1')).toBeInTheDocument();
      expect(screen.queryByText('project-prompt-1')).not.toBeInTheDocument();

      const projectTab = screen.getByTestId('project-prompts-tab');
      fireEvent.click(projectTab);
      expect(screen.getByText('project-prompt-1')).toBeInTheDocument();
      expect(screen.queryByText('global-prompt-1')).not.toBeInTheDocument();
    });
  });

  describe('Empty states', () => {
    it('should show project empty state when no project prompts exist', () => {
      mockUsePromptsList.mockReturnValue({
        prompts: mockGlobalPrompts,
        isLoading: false,
        isFetchingNextPage: false,
        fetchNextPage: jest.fn(),
        error: null,
      });

      render(<PromptTable {...defaultProps} />);

      expect(screen.getByTestId('prompt-table-empty-state')).toBeInTheDocument();
      expect(screen.getByText('No prompts found')).toBeInTheDocument();
      expect(
        screen.getByText('No saved prompts are available in this project.'),
      ).toBeInTheDocument();
    });

    it('should show global empty state when no global prompts exist', () => {
      mockUsePromptsList.mockReturnValue({
        prompts: mockProjectPrompts,
        isLoading: false,
        isFetchingNextPage: false,
        fetchNextPage: jest.fn(),
        error: null,
      });

      render(<PromptTable {...defaultProps} />);

      const globalTab = screen.getByTestId('global-prompts-tab');
      fireEvent.click(globalTab);

      expect(screen.getByTestId('global-prompts-empty-state')).toBeInTheDocument();
      expect(screen.getByText('No global prompts available')).toBeInTheDocument();
      expect(
        screen.getByText(
          'Global prompts are starter templates made available by your administrator. No global prompts are currently configured.',
        ),
      ).toBeInTheDocument();
    });

    it('should show empty states for both tabs when no prompts exist', () => {
      mockUsePromptsList.mockReturnValue({
        prompts: [],
        isLoading: false,
        isFetchingNextPage: false,
        fetchNextPage: jest.fn(),
        error: null,
      });

      render(<PromptTable {...defaultProps} />);

      expect(screen.getByTestId('prompt-table-empty-state')).toBeInTheDocument();

      const globalTab = screen.getByTestId('global-prompts-tab');
      fireEvent.click(globalTab);

      expect(screen.getByTestId('global-prompts-empty-state')).toBeInTheDocument();
    });
  });

  describe('Pagination', () => {
    it('should reset to page 1 when switching tabs', () => {
      mockUsePromptsList.mockReturnValue({
        prompts: mockMixedPrompts,
        isLoading: false,
        isFetchingNextPage: false,
        fetchNextPage: jest.fn(),
        error: null,
      });

      render(<PromptTable {...defaultProps} />);

      const pagination = screen.getAllByRole('navigation', { name: /pagination/ })[0];
      const nextButton = within(pagination).getByRole('button', { name: /next/i });

      fireEvent.click(nextButton);

      const globalTab = screen.getByTestId('global-prompts-tab');
      fireEvent.click(globalTab);

      const paginationAfterSwitch = screen.getAllByRole('navigation', { name: /pagination/ })[0];
      const pageInput = within(paginationAfterSwitch).getByRole('spinbutton', {
        name: /current page/i,
      });
      expect(pageInput).toHaveValue(1);
    });

    it('should use filtered prompts count for pagination', () => {
      mockUsePromptsList.mockReturnValue({
        prompts: mockMixedPrompts,
        isLoading: false,
        isFetchingNextPage: false,
        fetchNextPage: jest.fn(),
        error: null,
      });

      render(<PromptTable {...defaultProps} />);

      const projectPagination = screen.getAllByRole('navigation', { name: /pagination/ })[0];
      expect(within(projectPagination).getByText(/2 - 2/)).toBeInTheDocument();

      const globalTab = screen.getByTestId('global-prompts-tab');
      fireEvent.click(globalTab);

      const globalPagination = screen.getAllByRole('navigation', { name: /pagination/ })[0];
      expect(within(globalPagination).getByText(/2 - 2/)).toBeInTheDocument();
    });
  });

  describe('Selection state', () => {
    it('should clear selection when switching tabs', () => {
      mockUsePromptsList.mockReturnValue({
        prompts: mockMixedPrompts,
        isLoading: false,
        isFetchingNextPage: false,
        fetchNextPage: jest.fn(),
        error: null,
      });

      render(<PromptTable {...defaultProps} />);

      const projectRow = screen.getByRole('row', { name: /^project-prompt-1\s/ });
      fireEvent.click(projectRow);

      expect(projectRow).toHaveClass('pf-m-selected');

      const globalTab = screen.getByTestId('global-prompts-tab');
      fireEvent.click(globalTab);

      expect(screen.queryByRole('row', { name: /^project-prompt-1\s/ })).not.toBeInTheDocument();
    });
  });

  describe('Multiple global namespaces', () => {
    it('should group all global prompts together regardless of namespace', () => {
      const globalPromptsFromDifferentNamespaces: MLflowPrompt[] = [
        {
          name: 'template-1',
          description: 'Template from namespace 1',
          latest_version: 1,
          tags: {},
          creation_timestamp: '2024-01-20T12:00:00Z',
          scope: { type: 'global', namespace: 'namespace-1' },
        },
        {
          name: 'template-2',
          description: 'Template from namespace 2',
          latest_version: 1,
          tags: {},
          creation_timestamp: '2024-01-20T12:00:00Z',
          scope: { type: 'global', namespace: 'namespace-2' },
        },
        {
          name: 'template-3',
          description: 'Template from namespace 3',
          latest_version: 1,
          tags: {},
          creation_timestamp: '2024-01-20T12:00:00Z',
          scope: { type: 'global', namespace: 'namespace-3' },
        },
      ];

      mockUsePromptsList.mockReturnValue({
        prompts: globalPromptsFromDifferentNamespaces,
        isLoading: false,
        isFetchingNextPage: false,
        fetchNextPage: jest.fn(),
        error: null,
      });

      render(<PromptTable {...defaultProps} />);

      const globalTab = screen.getByTestId('global-prompts-tab');
      fireEvent.click(globalTab);

      expect(screen.getByText('template-1')).toBeInTheDocument();
      expect(screen.getByText('template-2')).toBeInTheDocument();
      expect(screen.getByText('template-3')).toBeInTheDocument();
    });
  });
});
