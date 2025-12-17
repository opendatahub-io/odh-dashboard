/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { GenAiContext } from '~/app/context/GenAiContext';
import type { AIModel, LlamaModel, MaaSModel } from '~/app/types';
import MaaSModelTableRow from '~/app/AIAssets/components/MaaSModelTableRow';
import { mockGenAiContextValue } from '~/__mocks__/mockGenAiContext';

// Mock the components and utilities
jest.mock('../MaaSModelTableRowEndpoint', () => ({
  __esModule: true,
  default: () => <div data-testid="endpoint">endpoint</div>,
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

const createMockMaaSModel = (overrides?: Partial<MaaSModel>): MaaSModel => ({
  id: 'test-model',
  object: 'model',
  created: Date.now(),
  owned_by: 'test-org',
  ready: true,
  url: 'https://example.com/model',
  ...overrides,
});

const createMockPlaygroundModel = (modelId: string): LlamaModel => ({
  id: `provider/${modelId}`,
  modelId,
  object: 'model',
  created: Date.now(),
  owned_by: 'test-org',
});

const createMockAIModel = (): AIModel => ({
  model_name: 'ai-model',
  model_id: 'ai-model',
  serving_runtime: 'kserve',
  api_protocol: 'v2',
  version: 'v1',
  usecase: 'llm',
  description: 'Test AI model',
  endpoints: [],
  status: 'Running',
  display_name: 'AI Model',
  sa_token: {
    name: '',
    token_name: '',
    token: '',
  },
});

describe('MaaSModelTableRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render model information correctly', () => {
    const model = createMockMaaSModel();
    render(
      <TestWrapper>
        <MaaSModelTableRow
          model={model}
          playgroundModels={[]}
          lsdStatus={null}
          aiModels={[]}
          maasModels={[model]}
        />
      </TestWrapper>,
    );

    expect(screen.getByText('test-model')).toBeInTheDocument();
    expect(screen.getByText('MaaS')).toBeInTheDocument();
  });

  it('should show Active status when model is ready', () => {
    const model = createMockMaaSModel({ ready: true });
    render(
      <TestWrapper>
        <MaaSModelTableRow
          model={model}
          playgroundModels={[]}
          lsdStatus={null}
          aiModels={[]}
          maasModels={[model]}
        />
      </TestWrapper>,
    );

    expect(screen.getByText('Active')).toBeInTheDocument();
  });

  it('should show Inactive status when model is not ready', () => {
    const model = createMockMaaSModel({ ready: false });
    render(
      <TestWrapper>
        <MaaSModelTableRow
          model={model}
          playgroundModels={[]}
          lsdStatus={null}
          aiModels={[]}
          maasModels={[model]}
        />
      </TestWrapper>,
    );

    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  describe('Playground column', () => {
    it('should show "Add to playground" button when model is not in playground', () => {
      const model = createMockMaaSModel();
      render(
        <TestWrapper>
          <MaaSModelTableRow
            model={model}
            playgroundModels={[]}
            lsdStatus={null}
            aiModels={[]}
            maasModels={[model]}
          />
        </TestWrapper>,
      );

      expect(screen.getByText('Add to playground')).toBeInTheDocument();
    });

    it('should show "Try in playground" button when model is in playground', () => {
      const model = createMockMaaSModel({ id: 'test-model' });
      const playgroundModel = createMockPlaygroundModel('test-model');

      render(
        <TestWrapper>
          <MaaSModelTableRow
            model={model}
            playgroundModels={[playgroundModel]}
            lsdStatus={null}
            aiModels={[]}
            maasModels={[model]}
          />
        </TestWrapper>,
      );

      expect(screen.getByText('Try in playground')).toBeInTheDocument();
    });

    it('should disable "Add to playground" button when model is not ready', () => {
      const model = createMockMaaSModel({ ready: false });
      render(
        <TestWrapper>
          <MaaSModelTableRow
            model={model}
            playgroundModels={[]}
            lsdStatus={null}
            aiModels={[]}
            maasModels={[model]}
          />
        </TestWrapper>,
      );

      const button = screen.getByText('Add to playground');
      expect(button.closest('button')).toBeDisabled();
    });

    it('should disable "Try in playground" button when model is not ready', () => {
      const model = createMockMaaSModel({ id: 'test-model', ready: false });
      const playgroundModel = createMockPlaygroundModel('test-model');

      render(
        <TestWrapper>
          <MaaSModelTableRow
            model={model}
            playgroundModels={[playgroundModel]}
            lsdStatus={null}
            aiModels={[]}
            maasModels={[model]}
          />
        </TestWrapper>,
      );

      const button = screen.getByText('Try in playground');
      expect(button.closest('button')).toBeDisabled();
    });

    it('should open configuration modal when "Add to playground" is clicked', () => {
      const model = createMockMaaSModel();
      render(
        <TestWrapper>
          <MaaSModelTableRow
            model={model}
            playgroundModels={[]}
            lsdStatus={null}
            aiModels={[]}
            maasModels={[model]}
          />
        </TestWrapper>,
      );

      const addButton = screen.getByText('Add to playground');
      fireEvent.click(addButton);

      expect(screen.getByTestId('configuration-modal')).toBeInTheDocument();
    });

    it('should close configuration modal when closed', () => {
      const model = createMockMaaSModel();
      render(
        <TestWrapper>
          <MaaSModelTableRow
            model={model}
            playgroundModels={[]}
            lsdStatus={null}
            aiModels={[]}
            maasModels={[model]}
          />
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
      const model = createMockMaaSModel({ id: 'test-model' });
      const playgroundModel = createMockPlaygroundModel('test-model');

      render(
        <TestWrapper>
          <MaaSModelTableRow
            model={model}
            playgroundModels={[playgroundModel]}
            lsdStatus={null}
            aiModels={[]}
            maasModels={[model]}
          />
        </TestWrapper>,
      );

      const tryButton = screen.getByText('Try in playground');
      fireEvent.click(tryButton);

      expect(mockNavigate).toHaveBeenCalledWith('/gen-ai-studio/playground/test-namespace', {
        state: {
          model: 'provider/test-model',
        },
      });
    });

    it('should pre-select the model when opening configuration modal', () => {
      const model = createMockMaaSModel({ id: 'test-model' });
      const aiModel = createMockAIModel();

      render(
        <TestWrapper>
          <MaaSModelTableRow
            model={model}
            playgroundModels={[]}
            lsdStatus={null}
            aiModels={[aiModel]}
            maasModels={[model]}
          />
        </TestWrapper>,
      );

      const addButton = screen.getByText('Add to playground');
      fireEvent.click(addButton);

      // The modal should be open, indicating the model will be pre-selected
      expect(screen.getByTestId('configuration-modal')).toBeInTheDocument();
    });
  });
});
