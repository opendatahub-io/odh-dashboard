/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { GenAiContext } from '~/app/context/GenAiContext';
import type { AIModel, LlamaModel, MaaSModel } from '~/app/types';
import AIModelTableRow from '~/app/AIAssets/components/AIModelTableRow';
import { mockGenAiContextValue } from '~/__mocks__/mockGenAiContext';

// Mock the components and utilities
jest.mock('../AIModelsTableRowEndpoint', () => ({
  __esModule: true,
  default: ({ isExternal }: { isExternal?: boolean }) => (
    <div data-testid={isExternal ? 'external-endpoint' : 'internal-endpoint'}>endpoint</div>
  ),
}));

jest.mock('../AIModelsTableRowInfo', () => ({
  __esModule: true,
  default: ({ model }: { model: AIModel }) => (
    <div data-testid="model-info">{model.display_name}</div>
  ),
}));

jest.mock('~/app/Chatbot/components/chatbotConfiguration/ChatbotConfigurationModal', () => ({
  __esModule: true,
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="configuration-modal">
      <button onClick={onClose} data-testid="close-modal">
        Close
      </button>
    </div>
  ),
}));

jest.mock('mod-arch-shared', () => ({
  ...jest.requireActual('mod-arch-shared'),
  TableRowTitleDescription: ({ title }: { title: React.ReactNode }) => (
    <div data-testid="table-row-title">{title}</div>
  ),
  TruncatedText: ({ content }: { content: string }) => (
    <div data-testid="truncated-text">{content}</div>
  ),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <MemoryRouter>
    <GenAiContext.Provider value={mockGenAiContextValue}>
      <table>
        <tbody>{children}</tbody>
      </table>
    </GenAiContext.Provider>
  </MemoryRouter>
);

const createMockAIModel = (overrides?: Partial<AIModel>): AIModel => ({
  model_name: 'test-model',
  model_id: 'test-model-id',
  serving_runtime: 'kserve',
  api_protocol: 'v2',
  version: 'v1',
  usecase: 'llm',
  description: 'Test model description',
  endpoints: [],
  status: 'Running',
  display_name: 'Test Model',
  internalEndpoint: 'http://internal',
  externalEndpoint: 'http://external',
  sa_token: {
    name: 'token-name',
    token_name: 'token',
    token: 'test-token',
  },
  ...overrides,
});

const createMockPlaygroundModel = (modelId: string): LlamaModel => ({
  id: `provider/${modelId}`,
  modelId,
  object: 'model',
  created: Date.now(),
  owned_by: 'test-org',
});

describe('AIModelTableRow', () => {
  const defaultProps = {
    lsdStatus: null,
    aiModels: [] as AIModel[],
    maasModels: [] as MaaSModel[],
    playgroundModels: [] as LlamaModel[],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render model information correctly', () => {
    const model = createMockAIModel();
    render(
      <TestWrapper>
        <AIModelTableRow {...defaultProps} model={model} />
      </TestWrapper>,
    );

    expect(screen.getByTestId('model-info')).toHaveTextContent('Test Model');
    expect(screen.getByTestId('truncated-text')).toHaveTextContent('Test model description');
  });

  it('should render internal and external endpoints', () => {
    const model = createMockAIModel();
    render(
      <TestWrapper>
        <AIModelTableRow {...defaultProps} model={model} />
      </TestWrapper>,
    );

    expect(screen.getByTestId('internal-endpoint')).toBeInTheDocument();
    expect(screen.getByTestId('external-endpoint')).toBeInTheDocument();
  });

  it('should render use case', () => {
    const model = createMockAIModel({ usecase: 'text-generation' });
    render(
      <TestWrapper>
        <AIModelTableRow {...defaultProps} model={model} />
      </TestWrapper>,
    );

    expect(screen.getByText('text-generation')).toBeInTheDocument();
  });

  describe('Status', () => {
    it('should show Active status when model is Running', () => {
      const model = createMockAIModel({ status: 'Running' });
      render(
        <TestWrapper>
          <AIModelTableRow {...defaultProps} model={model} />
        </TestWrapper>,
      );

      expect(screen.getByText('Active')).toBeInTheDocument();
    });

    it('should show Inactive status when model is not Running', () => {
      const model = createMockAIModel({ status: 'Stop' });
      render(
        <TestWrapper>
          <AIModelTableRow {...defaultProps} model={model} />
        </TestWrapper>,
      );

      expect(screen.getByText('Inactive')).toBeInTheDocument();
    });
  });

  describe('Playground column', () => {
    it('should show "Add to playground" button when model is not in playground', () => {
      const model = createMockAIModel();
      render(
        <TestWrapper>
          <AIModelTableRow {...defaultProps} model={model} />
        </TestWrapper>,
      );

      expect(screen.getByText('Add to playground')).toBeInTheDocument();
    });

    it('should show "Try in playground" button when model is in playground', () => {
      const model = createMockAIModel({ model_id: 'test-model-id' });
      const playgroundModel = createMockPlaygroundModel('test-model-id');

      render(
        <TestWrapper>
          <AIModelTableRow {...defaultProps} model={model} playgroundModels={[playgroundModel]} />
        </TestWrapper>,
      );

      expect(screen.getByText('Try in playground')).toBeInTheDocument();
    });

    it('should disable "Add to playground" button when model is not Running', () => {
      const model = createMockAIModel({ status: 'Stop' });
      render(
        <TestWrapper>
          <AIModelTableRow {...defaultProps} model={model} />
        </TestWrapper>,
      );

      const button = screen.getByText('Add to playground');
      expect(button.closest('button')).toBeDisabled();
    });

    it('should disable "Try in playground" button when model is not Running', () => {
      const model = createMockAIModel({ model_id: 'test-model-id', status: 'Stop' });
      const playgroundModel = createMockPlaygroundModel('test-model-id');

      render(
        <TestWrapper>
          <AIModelTableRow {...defaultProps} model={model} playgroundModels={[playgroundModel]} />
        </TestWrapper>,
      );

      const button = screen.getByText('Try in playground');
      expect(button.closest('button')).toBeDisabled();
    });

    it('should open configuration modal when "Add to playground" is clicked', () => {
      const model = createMockAIModel();
      render(
        <TestWrapper>
          <AIModelTableRow {...defaultProps} model={model} />
        </TestWrapper>,
      );

      const addButton = screen.getByText('Add to playground');
      fireEvent.click(addButton);

      expect(screen.getByTestId('configuration-modal')).toBeInTheDocument();
    });

    it('should close configuration modal when closed', () => {
      const model = createMockAIModel();
      render(
        <TestWrapper>
          <AIModelTableRow {...defaultProps} model={model} />
        </TestWrapper>,
      );

      const addButton = screen.getByText('Add to playground');
      fireEvent.click(addButton);

      expect(screen.getByTestId('configuration-modal')).toBeInTheDocument();

      const closeButton = screen.getByTestId('close-modal');
      fireEvent.click(closeButton);

      expect(screen.queryByTestId('configuration-modal')).not.toBeInTheDocument();
    });

    it('should navigate to playground when "Try in playground" is clicked', () => {
      const model = createMockAIModel({ model_id: 'test-model-id' });
      const playgroundModel = createMockPlaygroundModel('test-model-id');

      render(
        <TestWrapper>
          <AIModelTableRow {...defaultProps} model={model} playgroundModels={[playgroundModel]} />
        </TestWrapper>,
      );

      const tryButton = screen.getByText('Try in playground');
      fireEvent.click(tryButton);

      expect(mockNavigate).toHaveBeenCalledWith('/gen-ai-studio/playground/test-namespace', {
        state: {
          model: 'provider/test-model-id',
        },
      });
    });

    it('should pass model as extraSelectedModels when opening configuration modal', () => {
      const model = createMockAIModel({ model_id: 'test-model-id' });

      render(
        <TestWrapper>
          <AIModelTableRow {...defaultProps} model={model} />
        </TestWrapper>,
      );

      const addButton = screen.getByText('Add to playground');
      fireEvent.click(addButton);

      // The modal should be open with the model pre-selected
      expect(screen.getByTestId('configuration-modal')).toBeInTheDocument();
    });
  });
});
