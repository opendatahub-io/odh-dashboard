/* eslint-disable camelcase */
import { render, screen } from '@testing-library/react';
import React from 'react';
import { AIModel } from '~/app/types';
import ChatbotConfigurationTable from '~/app/Chatbot/components/chatbotConfiguration/ChatbotConfigurationTable';
import useGuardrailsEnabled from '~/app/Chatbot/hooks/useGuardrailsEnabled';

// Mock the useGuardrailsEnabled hook
jest.mock('~/app/Chatbot/hooks/useGuardrailsEnabled');

// Mock the mod-arch-shared module
jest.mock('mod-arch-shared', () => ({
  DashboardEmptyTableView: () => <div data-testid="empty-table-view">Empty</div>,
  Table: ({
    children,
    emptyTableView,
    ...props
  }: {
    children: React.ReactNode;
    emptyTableView: React.ReactNode;
    [key: string]: unknown;
  }) => (
    <div {...props}>
      {children}
      {emptyTableView}
    </div>
  ),
  useCheckboxTableBase: jest.fn(() => ({
    tableProps: {},
    isSelected: jest.fn(() => false),
    toggleSelection: jest.fn(),
  })),
  checkboxTableColumn: jest.fn(() => ({
    label: '',
    field: '',
    sortable: false,
  })),
}));

const mockAIModel: AIModel = {
  model_name: 'test-model',
  model_id: 'test-id',
  serving_runtime: 'test-runtime',
  api_protocol: 'openai',
  version: '1.0',
  usecase: 'test',
  description: 'Test model',
  endpoints: ['http://test-endpoint'],
  status: 'Running',
  display_name: 'Test Model',
  sa_token: {
    name: 'test-token',
    token_name: 'test-token-name',
    token: 'test-token-value',
  },
};

describe('ChatbotConfigurationTable - GuardrailsUnavailableAlert', () => {
  const defaultProps = {
    allModels: [mockAIModel],
    selectedModels: [],
    setSelectedModels: jest.fn(),
    maxTokensMap: new Map(),
    onMaxTokensChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('conditional alert rendering', () => {
    it('should show alert only when feature flag enabled AND guardrails unavailable', () => {
      // Test all four combinations
      const testCases = [
        { featureFlag: false, available: false, shouldShow: false },
        { featureFlag: false, available: true, shouldShow: false },
        { featureFlag: true, available: false, shouldShow: true },
        { featureFlag: true, available: true, shouldShow: false },
      ];

      testCases.forEach(({ featureFlag, available, shouldShow }) => {
        (useGuardrailsEnabled as jest.Mock).mockReturnValue(featureFlag);

        const { unmount } = render(
          <ChatbotConfigurationTable {...defaultProps} guardrailsAvailable={available} />,
        );

        if (shouldShow) {
          expect(screen.getByText('Guardrails unavailable')).toBeInTheDocument();
        } else {
          expect(screen.queryByText('Guardrails unavailable')).not.toBeInTheDocument();
        }

        unmount();
      });
    });

    it('should display complete alert message when shown', () => {
      (useGuardrailsEnabled as jest.Mock).mockReturnValue(true);
      render(<ChatbotConfigurationTable {...defaultProps} guardrailsAvailable={false} />);

      expect(
        screen.getByText(
          'Guardrails are not configured for this cluster. You can continue with the playground configuration, but guardrails will be disabled. Contact a cluster administrator to add guardrails.',
        ),
      ).toBeInTheDocument();
    });
  });

  describe('table rendering', () => {
    it('should render table with alert when conditions are met', () => {
      (useGuardrailsEnabled as jest.Mock).mockReturnValue(true);
      render(<ChatbotConfigurationTable {...defaultProps} guardrailsAvailable={false} />);

      expect(screen.getByText('Guardrails unavailable')).toBeInTheDocument();
      expect(screen.getByTestId('chatbot-configuration-table')).toBeInTheDocument();
      expect(screen.getByText('Available models')).toBeInTheDocument();
    });

    it('should render table without alert when guardrails available', () => {
      (useGuardrailsEnabled as jest.Mock).mockReturnValue(true);
      render(<ChatbotConfigurationTable {...defaultProps} guardrailsAvailable />);

      expect(screen.queryByText('Guardrails unavailable')).not.toBeInTheDocument();
      expect(screen.getByTestId('chatbot-configuration-table')).toBeInTheDocument();
      expect(screen.getByText('Available models')).toBeInTheDocument();
    });
  });
});
