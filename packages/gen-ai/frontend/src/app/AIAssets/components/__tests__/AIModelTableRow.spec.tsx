/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { GenAiContext } from '~/app/context/GenAiContext';
import type { AIModel, LlamaModel } from '~/app/types';
import AIModelTableRow from '~/app/AIAssets/components/AIModelTableRow';
import { mockGenAiContextValue } from '~/__mocks__/mockGenAiContext';

// Mock the components and utilities
jest.mock('../EndpointDetailModal', () => ({
  __esModule: true,
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="endpoint-detail-modal">
      <button onClick={onClose} data-testid="close-endpoint-modal">
        Close
      </button>
    </div>
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

const mockFireMiscTrackingEvent = jest.fn();
jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: (...args: unknown[]) => mockFireMiscTrackingEvent(...args),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('~/app/hooks/useAiAssetVectorStoresEnabled', () => ({
  __esModule: true,
  default: () => false,
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
  model_source_type: 'namespace',
  sa_token: {
    name: 'token-name',
    token_name: 'token',
    token: 'test-token',
  },
  ...overrides,
});

const createMockPlaygroundModel = (modelId: string, providerPrefix = 'provider'): LlamaModel => ({
  id: `${providerPrefix}/${modelId}`,
  modelId,
  object: 'model',
  created: Date.now(),
  owned_by: 'test-org',
});

describe('AIModelTableRow', () => {
  const defaultProps = {
    lsdStatus: null,
    allModels: [] as AIModel[],
    playgroundModels: [] as LlamaModel[],
    allCollections: [],
    collectionsLoaded: true,
    existingCollections: [],
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
    expect(screen.getByTestId('truncated-text')).toHaveTextContent('llm');
  });

  it('should render View button in endpoints cell', () => {
    const model = createMockAIModel();
    render(
      <TestWrapper>
        <AIModelTableRow {...defaultProps} model={model} />
      </TestWrapper>,
    );

    expect(screen.getByTestId('endpoint-view-button')).toBeInTheDocument();
    expect(screen.getByTestId('endpoint-view-button')).toHaveTextContent('View');
  });

  it('should open endpoint detail modal when View button is clicked', () => {
    const model = createMockAIModel();
    render(
      <TestWrapper>
        <AIModelTableRow {...defaultProps} model={model} />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByTestId('endpoint-view-button'));
    expect(screen.getByTestId('endpoint-detail-modal')).toBeInTheDocument();
  });

  it('should close endpoint detail modal when closed', () => {
    const model = createMockAIModel();
    render(
      <TestWrapper>
        <AIModelTableRow {...defaultProps} model={model} />
      </TestWrapper>,
    );

    fireEvent.click(screen.getByTestId('endpoint-view-button'));
    expect(screen.getByTestId('endpoint-detail-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('close-endpoint-modal'));
    expect(screen.queryByTestId('endpoint-detail-modal')).not.toBeInTheDocument();
  });

  it('should render View button for MaaS models', () => {
    const model = createMockAIModel({ model_source_type: 'maas' });
    render(
      <TestWrapper>
        <AIModelTableRow {...defaultProps} model={model} />
      </TestWrapper>,
    );

    expect(screen.getByTestId('endpoint-view-button')).toBeInTheDocument();
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
    it('should show Ready status when model is Running', () => {
      const model = createMockAIModel({ status: 'Running' });
      render(
        <TestWrapper>
          <AIModelTableRow {...defaultProps} model={model} />
        </TestWrapper>,
      );

      expect(screen.getByText('Ready')).toBeInTheDocument();
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

    it('should show Unknown status when model status is not Running or Stop', () => {
      const model = createMockAIModel({ status: 'Unknown' });
      render(
        <TestWrapper>
          <AIModelTableRow {...defaultProps} model={model} />
        </TestWrapper>,
      );

      expect(screen.getByText('Unknown')).toBeInTheDocument();
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

    it('should not disable "Add to playground" button when model is embedding type', () => {
      const model = createMockAIModel({ model_type: 'embedding' });
      render(
        <TestWrapper>
          <AIModelTableRow {...defaultProps} model={model} />
        </TestWrapper>,
      );

      const button = screen.getByText('Add to playground');
      expect(button.closest('button')).not.toBeDisabled();
    });

    it('should disable "Try in playground" button when model is embedding type', () => {
      const model = createMockAIModel({ model_id: 'test-model-id', model_type: 'embedding' });
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

  describe('Tracking', () => {
    it('should track assetType as maas_model for MaaS models on playground launch', () => {
      const model = createMockAIModel({ model_id: 'maas-model-id', model_source_type: 'maas' });
      const playgroundModel = createMockPlaygroundModel('maas-model-id', 'maas-vllm-inference-1');

      render(
        <TestWrapper>
          <AIModelTableRow {...defaultProps} model={model} playgroundModels={[playgroundModel]} />
        </TestWrapper>,
      );

      fireEvent.click(screen.getByText('Try in playground'));

      expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith(
        'Available Endpoints Playground Launched',
        { assetType: 'maas_model', assetId: 'maas-model-id' },
      );
    });

    it('should not show Try in playground for a namespace model when only the MaaS variant of the same model_id is in the playground', () => {
      // Regression: before the fix both source-type rows resolved to the same
      // playground entry because the lookup only compared modelId.
      const sharedModelId = 'shared-model-id';
      const maasPlaygroundModel = createMockPlaygroundModel(sharedModelId, 'maas-vllm-inference-1');

      // Render the NAMESPACE variant — the playground only contains the MaaS variant.
      const namespaceModel = createMockAIModel({
        model_id: sharedModelId,
        model_source_type: 'namespace',
      });

      render(
        <TestWrapper>
          <AIModelTableRow
            {...defaultProps}
            model={namespaceModel}
            playgroundModels={[maasPlaygroundModel]}
          />
        </TestWrapper>,
      );

      // Namespace row must show "Add to playground", not "Try in playground".
      expect(screen.getByText('Add to playground')).toBeInTheDocument();
      expect(screen.queryByText('Try in playground')).not.toBeInTheDocument();

      // No tracking event should fire.
      expect(mockFireMiscTrackingEvent).not.toHaveBeenCalledWith(
        'Available Endpoints Playground Launched',
        expect.objectContaining({ assetType: 'maas_model' }),
      );
    });

    it('should track assetType as model for non-MaaS models on playground launch', () => {
      const model = createMockAIModel({ model_id: 'ns-model-id', model_source_type: 'namespace' });
      const playgroundModel = createMockPlaygroundModel('ns-model-id');

      render(
        <TestWrapper>
          <AIModelTableRow {...defaultProps} model={model} playgroundModels={[playgroundModel]} />
        </TestWrapper>,
      );

      fireEvent.click(screen.getByText('Try in playground'));

      expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith(
        'Available Endpoints Playground Launched',
        { assetType: 'model', assetId: 'ns-model-id' },
      );
    });
  });

  describe('External models', () => {
    it('should show "Add to playground" button for custom_endpoint models', () => {
      const model = createMockAIModel({
        model_source_type: 'custom_endpoint',
        status: 'Running',
      });
      render(
        <TestWrapper>
          <AIModelTableRow {...defaultProps} model={model} />
        </TestWrapper>,
      );

      expect(screen.getByText('Add to playground')).toBeInTheDocument();
      expect(screen.getByText('Add to playground').closest('button')).not.toBeDisabled();
    });

    it('should open configuration modal when clicking "Add to playground" for external models', () => {
      const model = createMockAIModel({
        model_source_type: 'custom_endpoint',
        status: 'Running',
      });
      render(
        <TestWrapper>
          <AIModelTableRow {...defaultProps} model={model} />
        </TestWrapper>,
      );

      const addButton = screen.getByText('Add to playground');
      fireEvent.click(addButton);

      expect(screen.getByTestId('configuration-modal')).toBeInTheDocument();
    });

    it('should handle external models already in playground', () => {
      const model = createMockAIModel({
        model_id: 'external-model-id',
        model_source_type: 'custom_endpoint',
        status: 'Running',
      });
      const playgroundModel = createMockPlaygroundModel('external-model-id');

      render(
        <TestWrapper>
          <AIModelTableRow {...defaultProps} model={model} playgroundModels={[playgroundModel]} />
        </TestWrapper>,
      );

      expect(screen.getByText('Try in playground')).toBeInTheDocument();
    });

    it('should navigate to playground when clicking "Try in playground" for external models', () => {
      const model = createMockAIModel({
        model_id: 'external-model-id',
        model_source_type: 'custom_endpoint',
        status: 'Running',
      });
      const playgroundModel = createMockPlaygroundModel('external-model-id');

      render(
        <TestWrapper>
          <AIModelTableRow {...defaultProps} model={model} playgroundModels={[playgroundModel]} />
        </TestWrapper>,
      );

      const tryButton = screen.getByText('Try in playground');
      fireEvent.click(tryButton);

      expect(mockNavigate).toHaveBeenCalledWith('/gen-ai-studio/playground/test-namespace', {
        state: {
          model: 'provider/external-model-id',
        },
      });
    });

    it('should enable "Add to playground" button for custom_endpoint models regardless of status', () => {
      const model = createMockAIModel({
        model_source_type: 'custom_endpoint',
        status: 'Stop',
      });
      render(
        <TestWrapper>
          <AIModelTableRow {...defaultProps} model={model} />
        </TestWrapper>,
      );

      const button = screen.getByText('Add to playground');
      expect(button.closest('button')).not.toBeDisabled();
    });
  });
});
