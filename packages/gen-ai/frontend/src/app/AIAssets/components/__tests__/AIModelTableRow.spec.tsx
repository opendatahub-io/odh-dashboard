/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import { GenAiContext } from '~/app/context/GenAiContext';
import type { AIModel, LlamaModel, LlamaStackDistributionModel } from '~/app/types';
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

jest.mock('~/app/components/CapabilityBadges', () => ({
  __esModule: true,
  default: ({ capabilities }: { capabilities?: string[] }) => (
    <div data-testid="capability-badges">{(capabilities ?? []).join(',')}</div>
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

jest.mock('~/app/hooks/useChatPlaygroundEnabled', () => ({
  __esModule: true,
  default: () => true,
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
  ...overrides,
});

const createMockPlaygroundModel = (modelId: string, providerPrefix = 'provider'): LlamaModel => ({
  id: `${providerPrefix}/${modelId}`,
  modelId,
  object: 'model',
  created: Date.now(),
  owned_by: 'test-org',
});

const createMockLsdStatus = (): LlamaStackDistributionModel => ({
  name: 'test-lsd',
  phase: 'Ready',
  version: 'v1',
  distributionConfig: {
    activeDistribution: 'test-distribution',
    providers: [],
    availableDistributions: {},
  },
});

describe('AIModelTableRow', () => {
  const defaultProps = {
    lsdStatus: null as LlamaStackDistributionModel | null,
    playgroundModels: [] as LlamaModel[],
    showPlaygroundColumn: true,
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

  it('should render View button in Access details cell', () => {
    const model = createMockAIModel();
    render(
      <TestWrapper>
        <AIModelTableRow {...defaultProps} model={model} />
      </TestWrapper>,
    );

    expect(screen.getByTestId('endpoint-view-button')).toBeInTheDocument();
    expect(screen.getByTestId('endpoint-view-button')).toHaveTextContent('View');
    expect(screen.getByTestId('endpoint-view-button').closest('td')).toHaveAttribute(
      'data-label',
      'Access details',
    );
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
    it('should show "Try in playground" button when model is not in playground', () => {
      const model = createMockAIModel();
      render(
        <TestWrapper>
          <AIModelTableRow {...defaultProps} model={model} lsdStatus={createMockLsdStatus()} />
        </TestWrapper>,
      );

      expect(screen.getByText('Try in playground')).toBeInTheDocument();
    });

    it('should show "Try in playground" button when model is in playground', () => {
      const model = createMockAIModel({ model_id: 'test-model-id' });
      const playgroundModel = createMockPlaygroundModel('test-model-id');

      render(
        <TestWrapper>
          <AIModelTableRow
            {...defaultProps}
            model={model}
            playgroundModels={[playgroundModel]}
            lsdStatus={createMockLsdStatus()}
          />
        </TestWrapper>,
      );

      expect(screen.getByText('Try in playground')).toBeInTheDocument();
    });

    it('should disable "Try in playground" button when playground is not created', () => {
      const model = createMockAIModel();
      render(
        <TestWrapper>
          <AIModelTableRow {...defaultProps} model={model} />
        </TestWrapper>,
      );

      const button = screen.getByText('Try in playground');
      expect(button.closest('button')).toHaveAttribute('aria-disabled', 'true');
    });

    it('should show guidance tooltip on the disabled "Try in playground" button when playground is not created', async () => {
      const model = createMockAIModel();
      render(
        <TestWrapper>
          <AIModelTableRow {...defaultProps} model={model} />
        </TestWrapper>,
      );

      const button = screen.getByTestId('try-playground-button');
      expect(button).toHaveAttribute('aria-disabled', 'true');

      fireEvent.mouseEnter(button);

      const tooltip = await screen.findByRole('tooltip');
      expect(tooltip).toHaveTextContent(/^Select Create Playground before trying in Playground\.$/);
    });

    it('should not show guidance tooltip when the playground is created', () => {
      const model = createMockAIModel();
      render(
        <TestWrapper>
          <AIModelTableRow {...defaultProps} model={model} lsdStatus={createMockLsdStatus()} />
        </TestWrapper>,
      );

      const button = screen.getByTestId('try-playground-button');
      expect(button).not.toBeDisabled();

      fireEvent.mouseEnter(button);

      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('should enable "Try in playground" button once the playground is created', () => {
      const model = createMockAIModel();
      render(
        <TestWrapper>
          <AIModelTableRow {...defaultProps} model={model} lsdStatus={createMockLsdStatus()} />
        </TestWrapper>,
      );

      const button = screen.getByText('Try in playground');
      expect(button.closest('button')).not.toBeDisabled();
    });

    it('should disable "Try in playground" button when model is not Running', () => {
      const model = createMockAIModel({ model_id: 'test-model-id', status: 'Stop' });
      const playgroundModel = createMockPlaygroundModel('test-model-id');

      render(
        <TestWrapper>
          <AIModelTableRow
            {...defaultProps}
            model={model}
            playgroundModels={[playgroundModel]}
            lsdStatus={createMockLsdStatus()}
          />
        </TestWrapper>,
      );

      const button = screen.getByText('Try in playground');
      expect(button.closest('button')).toBeDisabled();
    });

    it('should disable "Try in playground" button when model is embedding type', () => {
      const model = createMockAIModel({ model_id: 'test-model-id', model_type: 'embedding' });
      const playgroundModel = createMockPlaygroundModel('test-model-id');

      render(
        <TestWrapper>
          <AIModelTableRow
            {...defaultProps}
            model={model}
            playgroundModels={[playgroundModel]}
            lsdStatus={createMockLsdStatus()}
          />
        </TestWrapper>,
      );

      const button = screen.getByText('Try in playground');
      expect(button.closest('button')).toBeDisabled();
    });

    it('should navigate to playground when "Try in playground" is clicked', () => {
      const model = createMockAIModel({ model_id: 'test-model-id' });
      const playgroundModel = createMockPlaygroundModel('test-model-id');

      render(
        <TestWrapper>
          <AIModelTableRow
            {...defaultProps}
            model={model}
            playgroundModels={[playgroundModel]}
            lsdStatus={createMockLsdStatus()}
          />
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

    it('should navigate to playground without a preselected model when the model is not registered', () => {
      const model = createMockAIModel({ model_id: 'test-model-id' });

      render(
        <TestWrapper>
          <AIModelTableRow {...defaultProps} model={model} lsdStatus={createMockLsdStatus()} />
        </TestWrapper>,
      );

      const tryButton = screen.getByText('Try in playground');
      fireEvent.click(tryButton);

      expect(mockNavigate).toHaveBeenCalledWith('/gen-ai-studio/playground/test-namespace', {
        state: {
          model: undefined,
        },
      });
    });

    it('should show "Used in Playground settings" for ASR models instead of Try button', () => {
      const model = createMockAIModel({ capabilities: ['audio-transcription'] });
      render(
        <TestWrapper>
          <AIModelTableRow {...defaultProps} model={model} />
        </TestWrapper>,
      );

      expect(screen.getByTestId('asr-playground-info')).toHaveTextContent(
        'Used in Playground settings',
      );
      expect(screen.queryByText('Try in playground')).not.toBeInTheDocument();
    });

    it('should not show playground button for ASR models', () => {
      const model = createMockAIModel({ capabilities: ['audio-transcription'] });
      render(
        <TestWrapper>
          <AIModelTableRow {...defaultProps} model={model} />
        </TestWrapper>,
      );

      expect(screen.queryByRole('button', { name: /playground/i })).not.toBeInTheDocument();
    });

    it('should show normal playground buttons for non-ASR namespace models', () => {
      const model = createMockAIModel({ model_source_type: 'namespace' });
      render(
        <TestWrapper>
          <AIModelTableRow {...defaultProps} model={model} lsdStatus={createMockLsdStatus()} />
        </TestWrapper>,
      );

      expect(screen.getByText('Try in playground')).toBeInTheDocument();
      expect(screen.queryByTestId('asr-playground-info')).not.toBeInTheDocument();
    });
  });

  describe('Tracking', () => {
    it('should track assetType as maas_model for MaaS models on playground launch', () => {
      const model = createMockAIModel({
        model_id: 'publishers/llm/models/gemini',
        model_source_type: 'maas',
      });
      const playgroundModel = createMockPlaygroundModel(
        'publishers/llm/models/gemini',
        'maas-vllm-inference-1',
      );

      render(
        <TestWrapper>
          <AIModelTableRow
            {...defaultProps}
            model={model}
            playgroundModels={[playgroundModel]}
            lsdStatus={createMockLsdStatus()}
          />
        </TestWrapper>,
      );

      fireEvent.click(screen.getByText('Try in playground'));

      expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith(
        'Available Endpoints Playground Launched',
        { assetType: 'maas_model', assetId: 'publishers/llm/models/gemini' },
      );
    });

    it('should show Try in playground when a namespace model ID is in the playground', () => {
      // Model IDs are unique across sources, so the playground lookup only
      // needs to compare model IDs.
      const sharedModelId = 'shared-model-id';
      const maasPlaygroundModel = createMockPlaygroundModel(sharedModelId, 'maas-vllm-inference-1');

      // Render the namespace model with the same ID as the playground model.
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
            lsdStatus={createMockLsdStatus()}
          />
        </TestWrapper>,
      );

      expect(screen.getByText('Try in playground')).toBeInTheDocument();

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
          <AIModelTableRow
            {...defaultProps}
            model={model}
            playgroundModels={[playgroundModel]}
            lsdStatus={createMockLsdStatus()}
          />
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
    it('should show enabled "Try in playground" button for custom_endpoint models', () => {
      const model = createMockAIModel({
        model_source_type: 'custom_endpoint',
        status: 'Running',
      });
      render(
        <TestWrapper>
          <AIModelTableRow {...defaultProps} model={model} lsdStatus={createMockLsdStatus()} />
        </TestWrapper>,
      );

      expect(screen.getByText('Try in playground')).toBeInTheDocument();
      expect(screen.getByText('Try in playground').closest('button')).not.toBeDisabled();
    });

    it('should disable "Try in playground" button for custom_endpoint models when playground is not created', () => {
      const model = createMockAIModel({
        model_source_type: 'custom_endpoint',
        status: 'Running',
      });
      render(
        <TestWrapper>
          <AIModelTableRow {...defaultProps} model={model} />
        </TestWrapper>,
      );

      expect(screen.getByText('Try in playground').closest('button')).toHaveAttribute(
        'aria-disabled',
        'true',
      );
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
          <AIModelTableRow
            {...defaultProps}
            model={model}
            playgroundModels={[playgroundModel]}
            lsdStatus={createMockLsdStatus()}
          />
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
          <AIModelTableRow
            {...defaultProps}
            model={model}
            playgroundModels={[playgroundModel]}
            lsdStatus={createMockLsdStatus()}
          />
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

    it('should enable "Try in playground" button for custom_endpoint models regardless of status', () => {
      const model = createMockAIModel({
        model_source_type: 'custom_endpoint',
        status: 'Stop',
      });
      render(
        <TestWrapper>
          <AIModelTableRow {...defaultProps} model={model} lsdStatus={createMockLsdStatus()} />
        </TestWrapper>,
      );

      const button = screen.getByText('Try in playground');
      expect(button.closest('button')).not.toBeDisabled();
    });
  });

  describe('Playground column - disabled', () => {
    it('should not render playground column when showPlaygroundColumn is false', () => {
      const model = createMockAIModel();
      render(
        <TestWrapper>
          <AIModelTableRow {...defaultProps} model={model} showPlaygroundColumn={false} />
        </TestWrapper>,
      );

      expect(screen.queryByText('Try in playground')).not.toBeInTheDocument();
    });

    it('should not render playground buttons even when model is in playground if column is disabled', () => {
      const model = createMockAIModel({ model_id: 'test-model-id' });
      const playgroundModel = createMockPlaygroundModel('test-model-id');

      render(
        <TestWrapper>
          <AIModelTableRow
            {...defaultProps}
            model={model}
            playgroundModels={[playgroundModel]}
            lsdStatus={createMockLsdStatus()}
            showPlaygroundColumn={false}
          />
        </TestWrapper>,
      );

      expect(screen.queryByText('Try in playground')).not.toBeInTheDocument();
    });
  });
});
