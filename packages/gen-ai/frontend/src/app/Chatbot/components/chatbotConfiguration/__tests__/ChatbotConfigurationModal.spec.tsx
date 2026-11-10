/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import {
  AIModel,
  ApiErrorClass,
  ExternalVectorStoreSummary,
  LlamaModel,
  LlamaStackDistributionModel,
  VectorStore,
} from '~/app/types';
import ChatbotConfigurationModal from '~/app/Chatbot/components/chatbotConfiguration/ChatbotConfigurationModal';
import useGuardrailsEnabled from '~/app/Chatbot/hooks/useGuardrailsEnabled';
import useTracingEnabled from '~/app/Chatbot/hooks/useTracingEnabled';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';
import useAiAssetVectorStoresEnabled from '~/app/hooks/useAiAssetVectorStoresEnabled';
import { GenAiContext } from '~/app/context/GenAiContext';
import { mockGenAiContextValue } from '~/__mocks__/mockGenAiContext';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireFormTrackingEvent: jest.fn(),
  fireMiscTrackingEvent: jest.fn(),
}));

jest.mock('~/app/Chatbot/hooks/useGuardrailsEnabled');
jest.mock('~/app/Chatbot/hooks/useTracingEnabled');
jest.mock('~/app/hooks/useGenAiAPI');
jest.mock('~/app/hooks/useAiAssetVectorStoresEnabled');
jest.mock('~/app/hooks/useChatPlaygroundEnabled', () => ({
  __esModule: true,
  default: () => true,
}));

const mockFireFormTrackingEvent = jest.mocked(fireFormTrackingEvent);
const mockInstallLSD = jest.fn();
const mockInitNemoGuardrails = jest.fn();
const mockUseGenAiAPI = useGenAiAPI as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();

  (useGuardrailsEnabled as jest.Mock).mockReturnValue(false);
  (useTracingEnabled as jest.Mock).mockReturnValue(false);
  (useAiAssetVectorStoresEnabled as jest.Mock).mockReturnValue(false);

  mockUseGenAiAPI.mockReturnValue({
    apiAvailable: true,
    api: {
      installLSD: mockInstallLSD,
      initNemoGuardrails: mockInitNemoGuardrails,
    },
  });

  mockInstallLSD.mockResolvedValue({ data: null });
  mockInitNemoGuardrails.mockResolvedValue({ name: 'nemoguardrails' });
});

jest.mock('~/app/Chatbot/components/chatbotConfiguration/ChatbotConfigurationTable', () => ({
  __esModule: true,
  default: ({ selectedModels }: { selectedModels: AIModel[] }) => (
    <div data-testid="selected-models">
      {JSON.stringify({
        models: selectedModels.map((m) => m.model_name),
      })}
    </div>
  ),
}));

jest.mock(
  '~/app/Chatbot/components/chatbotConfiguration/ChatbotConfigurationCollectionsTable',
  () => ({
    __esModule: true,
    default: ({
      selectedCollections,
      setSelectedCollections,
      allCollections,
    }: {
      selectedCollections: ExternalVectorStoreSummary[];
      setSelectedCollections: (next: ExternalVectorStoreSummary[]) => void;
      allCollections: ExternalVectorStoreSummary[];
    }) => (
      <div data-testid="collections-table">
        <span data-testid="collections-json">
          {JSON.stringify({
            selected: selectedCollections.map((c) => c.vector_store_id),
            all: allCollections.map((c) => c.vector_store_id),
          })}
        </span>
        {selectedCollections.map((c) => (
          <button
            key={c.vector_store_id}
            type="button"
            onClick={() =>
              setSelectedCollections(
                selectedCollections.filter((s) => s.vector_store_id !== c.vector_store_id),
              )
            }
          >
            {`Deselect ${c.vector_store_id}`}
          </button>
        ))}
      </div>
    ),
  }),
);

// ─── Helpers ────────────────────────────────────────────────────────────────

const createAIModel = (overrides: Partial<AIModel>): AIModel => ({
  model_name: 'model-name',
  model_id: overrides.model_name || 'model-name',
  display_name: 'Display Name',
  description: 'desc',
  endpoints: [],
  serving_runtime: 'kserve',
  api_protocol: 'v2',
  version: 'v1',
  usecase: 'llm',
  status: 'Running',
  model_source_type: 'namespace',
  ...overrides,
});

const createCollection = (
  overrides: Partial<ExternalVectorStoreSummary>,
): ExternalVectorStoreSummary => ({
  vector_store_id: 'vs-1',
  vector_store_name: 'Test Store',
  provider_id: 'milvus',
  provider_type: 'inline::milvus',
  embedding_model: 'embed-model',
  embedding_dimension: 768,
  ...overrides,
});

const createLSDVectorStore = (id: string, overrides?: Partial<VectorStore>): VectorStore => ({
  id,
  name: 'Test Store',
  created_at: Date.now(),
  last_active_at: Date.now(),
  object: 'vector_store',
  status: 'completed',
  usage_bytes: 0,
  file_counts: { cancelled: 0, completed: 0, failed: 0, in_progress: 0, total: 0 },
  metadata: { provider_id: 'milvus' },
  ...overrides,
});

type RenderModalProps = {
  allModels: AIModel[];
  existingModels?: LlamaModel[];
  allCollections?: ExternalVectorStoreSummary[];
  collectionsLoaded?: boolean;
  existingCollections?: VectorStore[];
  extraSelectedCollections?: ExternalVectorStoreSummary[];
  lsdStatus?: LlamaStackDistributionModel | null;
  initialStepId?: string;
  onUpdateInitiated?: () => void;
};

const renderModal = (props: RenderModalProps) =>
  render(
    <MemoryRouter>
      <ChatbotConfigurationModal
        onClose={() => undefined}
        lsdStatus={props.lsdStatus ?? null}
        aiModels={props.allModels}
        existingModels={props.existingModels}
        allCollections={props.allCollections ?? []}
        collectionsLoaded={props.collectionsLoaded ?? true}
        existingCollections={props.existingCollections}
        extraSelectedCollections={props.extraSelectedCollections}
        initialStepId={props.initialStepId}
        onUpdateInitiated={props.onUpdateInitiated}
      />
    </MemoryRouter>,
  );

const renderModalWithContext = (props: RenderModalProps) =>
  render(
    <GenAiContext.Provider value={mockGenAiContextValue}>
      <MemoryRouter>
        <ChatbotConfigurationModal
          onClose={() => undefined}
          lsdStatus={props.lsdStatus ?? null}
          aiModels={props.allModels}
          existingModels={props.existingModels}
          allCollections={props.allCollections ?? []}
          collectionsLoaded={props.collectionsLoaded ?? true}
          existingCollections={props.existingCollections}
          extraSelectedCollections={props.extraSelectedCollections}
          initialStepId={props.initialStepId}
          onUpdateInitiated={props.onUpdateInitiated}
        />
      </MemoryRouter>
    </GenAiContext.Provider>,
  );

const getSelectedModelNames = (): string[] => {
  const json = screen.getByTestId('selected-models').textContent || '{}';
  const parsed = JSON.parse(json) as {
    models: string[];
  };
  return parsed.models;
};

const getSelectedCollectionIds = (): string[] => {
  const json = screen.getByTestId('collections-json').textContent || '{}';
  const parsed = JSON.parse(json) as { selected: string[]; all: string[] };
  return parsed.selected;
};

const getAllCollectionIds = (): string[] => {
  const json = screen.getByTestId('collections-json').textContent || '{}';
  const parsed = JSON.parse(json) as { selected: string[]; all: string[] };
  return parsed.all;
};

// ─── Pre-selected models ─────────────────────────────────────────────────────

describe('ChatbotConfigurationModal auto-selected models', () => {
  const aiA = createAIModel({ model_name: 'mA', display_name: 'A' });
  const aiB = createAIModel({ model_name: 'mB', display_name: 'B' });
  const aiC = createAIModel({ model_name: 'mC', display_name: 'C' });
  const aiD = createAIModel({ model_name: 'mD', display_name: 'D', status: 'Stop' });
  const allModels = [aiA, aiB, aiC, aiD];

  it('auto-selects all non-embedding models regardless of status', () => {
    renderModal({ allModels });
    expect(getSelectedModelNames()).toEqual(['mA', 'mB', 'mC', 'mD']);
  });

  it('auto-selects all non-embedding models even when existingModels is provided', () => {
    const existing: LlamaModel[] = [
      { id: 'pA/mA', object: 'model', created: Date.now(), owned_by: 'x', modelId: 'mA' },
    ];
    renderModal({ allModels, existingModels: existing });
    expect(getSelectedModelNames()).toEqual(['mA', 'mB', 'mC', 'mD']);
  });

  it('excludes embedding models from auto-selection', () => {
    const embeddingModel = createAIModel({
      model_name: 'embed-model',
      display_name: 'Embedding',
      model_type: 'embedding',
    });
    renderModal({ allModels: [...allModels, embeddingModel] });
    expect(getSelectedModelNames()).toEqual(['mA', 'mB', 'mC', 'mD']);
  });

  it('includes embedding models when required by a pre-selected collection', () => {
    const embeddingModel = createAIModel({
      model_name: 'embed-model',
      model_id: 'embed-model',
      display_name: 'Embedding',
      model_type: 'embedding',
    });
    const collection: ExternalVectorStoreSummary = {
      vector_store_id: 'vs-1',
      vector_store_name: 'test-vs',
      provider_id: 'provider-1',
      provider_type: 'remote::passthrough',
      embedding_model: 'embed-model',
      embedding_dimension: 768,
    };
    const existingVs: VectorStore = {
      id: 'vs-1',
      name: 'test-vs',
      object: 'vector_store',
      created_at: 1700000000,
      last_active_at: 1700000000,
      file_counts: { cancelled: 0, completed: 0, failed: 0, in_progress: 0, total: 0 },
      metadata: { provider_id: 'provider-1' },
      status: 'completed',
      usage_bytes: 0,
    };
    renderModal({
      allModels: [...allModels, embeddingModel],
      allCollections: [collection],
      existingCollections: [existingVs],
    });
    expect(getSelectedModelNames()).toContain('embed-model');
  });
});

// ─── MaaS model support ───────────────────────────────────────────────────────

describe('ChatbotConfigurationModal MaaS model support', () => {
  it('includes MaaS models in selection', () => {
    const regularModel = createAIModel({ model_name: 'regular-model' });
    const maasModel = createAIModel({
      model_name: 'Granite MaaS',
      model_id: 'granite-7b-lab',
      model_source_type: 'maas',
    });
    renderModal({ allModels: [regularModel, maasModel] });
    expect(getSelectedModelNames()).toEqual(['regular-model', 'Granite MaaS']);
  });

  it('should include both namespace and MaaS versions of the same model', () => {
    const namespaceModel = createAIModel({ model_name: 'granite-7b-lab' });
    const maasModel = createAIModel({
      model_name: 'granite-7b-lab-maas',
      model_id: 'granite-7b-lab',
      model_source_type: 'maas',
    });
    renderModal({ allModels: [namespaceModel, maasModel] });
    const names = getSelectedModelNames();
    expect(names).toHaveLength(2);
    expect(names).toContain('granite-7b-lab');
    expect(names).toContain('granite-7b-lab-maas');
  });

  it('produces exactly one installLSD payload entry for a single MaaS model', async () => {
    const user = userEvent.setup();
    const maasModel = createAIModel({
      model_name: 'granite-maas',
      model_id: 'granite-7b-lab',
      model_source_type: 'maas',
    });
    renderModalWithContext({ allModels: [maasModel] });

    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(mockInstallLSD).toHaveBeenCalledTimes(1);
      const payload = mockInstallLSD.mock.calls[0][0];
      expect(payload.models).toHaveLength(1);
      expect(payload.models[0]).toEqual(
        expect.objectContaining({
          model_name: 'granite-7b-lab',
          model_source_type: 'maas',
        }),
      );
    });
  });
});

// ─── ASR model exclusion ──────────────────────────────────────────────────────

describe('ChatbotConfigurationModal ASR model exclusion', () => {
  it('excludes ASR-only models from the model list', () => {
    const chatModel = createAIModel({ model_name: 'chat-model', display_name: 'Chat Model' });
    const asrModel = createAIModel({
      model_name: 'whisper-asr',
      display_name: 'Whisper ASR',
      capabilities: ['audio-transcription'],
    });
    renderModal({ allModels: [chatModel, asrModel] });
    expect(getSelectedModelNames()).toEqual(['chat-model']);
  });

  it('keeps models that have ASR plus other capabilities', () => {
    const chatModel = createAIModel({ model_name: 'chat-model', display_name: 'Chat Model' });
    const multiCapModel = createAIModel({
      model_name: 'multi-cap',
      display_name: 'Multi Cap',
      capabilities: ['text-generation', 'audio-transcription'],
    });
    renderModal({ allModels: [chatModel, multiCapModel] });
    expect(getSelectedModelNames()).toEqual(['chat-model', 'multi-cap']);
  });

  it('keeps models without capabilities (defaults to text-generation)', () => {
    const chatModel = createAIModel({ model_name: 'chat-model', display_name: 'Chat Model' });
    const noCapsModel = createAIModel({
      model_name: 'no-caps',
      display_name: 'No Caps Model',
    });
    renderModal({ allModels: [chatModel, noCapsModel] });
    expect(getSelectedModelNames()).toEqual(['chat-model', 'no-caps']);
  });

  it('excludes ASR-only models from auto-selection', () => {
    const chatModel = createAIModel({ model_name: 'chat-model', display_name: 'Chat Model' });
    const asrModel = createAIModel({
      model_name: 'whisper-asr',
      display_name: 'Whisper ASR',
      capabilities: ['audio-transcription'],
    });
    renderModal({ allModels: [chatModel, asrModel] });
    expect(getSelectedModelNames()).toEqual(['chat-model']);
  });
});

// ─── Guardrails ───────────────────────────────────────────────────────────────

describe('ChatbotConfigurationModal guardrails configuration', () => {
  const allModels = [createAIModel({ model_name: 'test-model' })];

  it('includes enable_guardrails: false when feature flag is disabled', async () => {
    const user = userEvent.setup();
    (useGuardrailsEnabled as jest.Mock).mockReturnValue(false);
    renderModalWithContext({ allModels });

    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(mockInstallLSD).toHaveBeenCalledWith(
        expect.objectContaining({
          models: [
            expect.objectContaining({
              model_name: 'test-model',
              model_source_type: 'namespace',
              model_type: 'llm',
            }),
          ],
          enable_guardrails: false,
        }),
      );
    });
  });

  it('does not send installation-time max_tokens for an inference model', async () => {
    const user = userEvent.setup();
    renderModalWithContext({ allModels });

    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(mockInstallLSD).toHaveBeenCalledTimes(1);
    });
    expect(mockInstallLSD.mock.calls[0][0].models[0]).not.toHaveProperty('max_tokens');
  });

  it('includes enable_guardrails: true when feature flag is enabled', async () => {
    const user = userEvent.setup();
    (useGuardrailsEnabled as jest.Mock).mockReturnValue(true);
    renderModalWithContext({ allModels });

    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(mockInstallLSD).toHaveBeenCalledWith(
        expect.objectContaining({ enable_guardrails: true }),
      );
    });
  });

  it('swallows a conflict error from initNemoGuardrails and completes submit', async () => {
    const user = userEvent.setup();
    (useGuardrailsEnabled as jest.Mock).mockReturnValue(true);
    mockInitNemoGuardrails.mockRejectedValue(
      new ApiErrorClass({
        component: 'guardrails',
        code: 'conflict',
        message: 'already initialized',
        retriable: false,
      }),
    );
    renderModalWithContext({ allModels });

    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(mockInstallLSD).toHaveBeenCalled();
    });
    expect(screen.queryByText(/Error configuring playground/i)).not.toBeInTheDocument();
  });

  it('surfaces non-conflict errors from initNemoGuardrails', async () => {
    const user = userEvent.setup();
    (useGuardrailsEnabled as jest.Mock).mockReturnValue(true);
    mockInitNemoGuardrails.mockRejectedValue(
      new ApiErrorClass({
        component: 'guardrails',
        code: 'server_error',
        message: 'internal server error',
        retriable: false,
      }),
    );
    renderModalWithContext({ allModels });

    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(screen.getByText(/Error configuring playground/i)).toBeInTheDocument();
    });
  });
});

// ─── Step navigation ──────────────────────────────────────────────────────────

describe('ChatbotConfigurationModal step navigation', () => {
  const embedModel = createAIModel({ model_name: 'embed-model', model_id: 'embed-model' });
  const collection = createCollection({ vector_store_id: 'vs-1', embedding_model: 'embed-model' });

  it('shows Create button when there is only a models step', () => {
    renderModal({ allModels: [embedModel] });
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
  });

  it('shows Next button when collections step is enabled', () => {
    (useAiAssetVectorStoresEnabled as jest.Mock).mockReturnValue(true);
    renderModal({
      allModels: [embedModel],
      allCollections: [collection],
      collectionsLoaded: true,
    });
    expect(screen.getByRole('button', { name: /next: select collections/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /create/i })).not.toBeInTheDocument();
  });

  it('shows disabled Next button while collections are loading', () => {
    (useAiAssetVectorStoresEnabled as jest.Mock).mockReturnValue(true);
    renderModal({
      allModels: [embedModel],
      allCollections: [collection],
      collectionsLoaded: false,
    });
    const nextButton = screen.getByRole('button', { name: /next/i });
    expect(nextButton).toBeDisabled();
  });

  it('navigates to collections step on Next click and shows back button', async () => {
    const user = userEvent.setup();
    (useAiAssetVectorStoresEnabled as jest.Mock).mockReturnValue(true);
    renderModal({
      allModels: [embedModel],
      allCollections: [collection],
      collectionsLoaded: true,
    });

    await user.click(screen.getByRole('button', { name: /next: select collections/i }));

    expect(screen.getByTestId('collections-table')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /back to inference models/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
  });

  it('back button returns to models step', async () => {
    const user = userEvent.setup();
    (useAiAssetVectorStoresEnabled as jest.Mock).mockReturnValue(true);
    renderModal({
      allModels: [embedModel],
      allCollections: [collection],
      collectionsLoaded: true,
    });

    await user.click(screen.getByRole('button', { name: /next: select collections/i }));
    await user.click(screen.getByRole('button', { name: /back to inference models/i }));

    expect(screen.getByTestId('selected-models')).toBeInTheDocument();
    expect(screen.queryByTestId('collections-table')).not.toBeInTheDocument();
  });

  it('shows Configure instead of Create when lsdStatus is provided (update mode)', () => {
    const lsdStatus: LlamaStackDistributionModel = {
      name: 'lsd-playground',
      phase: 'Ready',
      version: '0.1.0',
      distributionConfig: {
        activeDistribution: 'rh',
        providers: [],
        availableDistributions: {},
      },
    };
    renderModal({ allModels: [embedModel], lsdStatus });
    expect(screen.getByRole('button', { name: /configure/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^create$/i })).not.toBeInTheDocument();
  });

  it('opens directly on collections step when initialStepId="collections"', () => {
    (useAiAssetVectorStoresEnabled as jest.Mock).mockReturnValue(true);
    renderModal({
      allModels: [embedModel],
      allCollections: [collection],
      collectionsLoaded: true,
      initialStepId: 'collections',
    });

    expect(screen.getByTestId('collections-table')).toBeInTheDocument();
    expect(screen.queryByTestId('selected-models')).not.toBeInTheDocument();
  });

  it('does not show back button on the first step', () => {
    renderModal({ allModels: [embedModel] });
    expect(screen.queryByRole('button', { name: /back to/i })).not.toBeInTheDocument();
  });
});

// ─── Collections step visibility ──────────────────────────────────────────────

describe('ChatbotConfigurationModal collections step visibility', () => {
  const embedModel = createAIModel({ model_name: 'embed-model', model_id: 'embed-model' });
  const collection = createCollection({ vector_store_id: 'vs-1', embedding_model: 'embed-model' });

  it('hides collections step when feature flag is disabled', () => {
    (useAiAssetVectorStoresEnabled as jest.Mock).mockReturnValue(false);
    renderModal({
      allModels: [embedModel],
      allCollections: [collection],
      collectionsLoaded: true,
    });
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
  });

  it('hides collections step when no collections available', () => {
    (useAiAssetVectorStoresEnabled as jest.Mock).mockReturnValue(true);
    renderModal({ allModels: [embedModel], allCollections: [], collectionsLoaded: true });
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument();
  });

  it('filters out collections whose embedding model is not in allModels', () => {
    (useAiAssetVectorStoresEnabled as jest.Mock).mockReturnValue(true);
    const collectionWithMissingModel = createCollection({
      vector_store_id: 'vs-missing',
      embedding_model: 'nonexistent-model',
    });
    // Only this collection exists but its embedding model is not in allModels
    renderModal({
      allModels: [embedModel],
      allCollections: [collectionWithMissingModel],
      collectionsLoaded: true,
    });
    // Collections step is hidden because availableCollections is empty after filtering
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
  });

  it('shows collections step when feature enabled, loaded, and has valid collections', async () => {
    const user = userEvent.setup();
    (useAiAssetVectorStoresEnabled as jest.Mock).mockReturnValue(true);
    renderModal({
      allModels: [embedModel],
      allCollections: [collection],
      collectionsLoaded: true,
    });

    await user.click(screen.getByRole('button', { name: /next: select collections/i }));
    expect(getAllCollectionIds()).toEqual(['vs-1']);
  });
});

// ─── Collections pre-selection ────────────────────────────────────────────────

describe('ChatbotConfigurationModal collections pre-selection', () => {
  const embedModel = createAIModel({ model_name: 'embed-model', model_id: 'embed-model' });
  const vs1 = createCollection({ vector_store_id: 'vs-1', embedding_model: 'embed-model' });
  const vs2 = createCollection({ vector_store_id: 'vs-2', embedding_model: 'embed-model' });

  const navigateToCollections = async () => {
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /next: select collections/i }));
    return user;
  };

  beforeEach(() => {
    (useAiAssetVectorStoresEnabled as jest.Mock).mockReturnValue(true);
  });

  it('pre-selects collections already registered in the playground (existingCollections)', async () => {
    const existing = createLSDVectorStore('vs-1');
    renderModal({
      allModels: [embedModel],
      allCollections: [vs1, vs2],
      collectionsLoaded: true,
      existingCollections: [existing],
    });

    await navigateToCollections();
    expect(getSelectedCollectionIds()).toEqual(['vs-1']);
  });

  it('pre-selects the extraSelectedCollections store (opened from a row)', async () => {
    renderModal({
      allModels: [embedModel],
      allCollections: [vs1, vs2],
      collectionsLoaded: true,
      extraSelectedCollections: [vs2],
    });

    await navigateToCollections();
    expect(getSelectedCollectionIds()).toEqual(['vs-2']);
  });

  it('merges extraSelectedCollections with existingCollections, deduplicating', async () => {
    const existing = createLSDVectorStore('vs-1');
    renderModal({
      allModels: [embedModel],
      allCollections: [vs1, vs2],
      collectionsLoaded: true,
      existingCollections: [existing],
      extraSelectedCollections: [vs2],
    });

    await navigateToCollections();
    expect(getSelectedCollectionIds()).toEqual(['vs-2', 'vs-1']);
  });

  it('starts with nothing pre-selected when existingCollections and extraSelected are empty', async () => {
    renderModal({
      allModels: [embedModel],
      allCollections: [vs1, vs2],
      collectionsLoaded: true,
    });

    await navigateToCollections();
    expect(getSelectedCollectionIds()).toEqual([]);
  });

  it('does not pre-select a collection whose embedding model is not in allModels', async () => {
    const vsWithMissingModel = createCollection({
      vector_store_id: 'vs-bad',
      embedding_model: 'nonexistent-model',
    });
    renderModal({
      allModels: [embedModel],
      allCollections: [vs1, vsWithMissingModel],
      collectionsLoaded: true,
      extraSelectedCollections: [vsWithMissingModel],
    });

    await navigateToCollections();
    expect(getSelectedCollectionIds()).toEqual([]);
    // Only the valid collection should appear in the table
    expect(getAllCollectionIds()).toEqual(['vs-1']);
  });
});

describe('ChatbotConfigurationModal form tracking', () => {
  const allModels = [createAIModel({ model_name: 'test-model' })];

  describe('Playground Setup (create mode)', () => {
    it('fires success tracking event with correct properties after successful install', async () => {
      const user = userEvent.setup();
      renderModalWithContext({ allModels });

      await user.click(screen.getByRole('button', { name: /create/i }));

      await waitFor(() => {
        expect(mockFireFormTrackingEvent).toHaveBeenCalledWith('Playground Setup', {
          outcome: 'submit',
          success: true,
          namespace: 'test-namespace',
          countModelsSelected: 1,
          countCollectionsSelected: 0,
          countEmbeddingModels: 0,
        });
      });
    });

    it('fires cancel tracking event when modal is closed', async () => {
      const user = userEvent.setup();
      renderModalWithContext({ allModels });

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockFireFormTrackingEvent).toHaveBeenCalledWith('Playground Setup', {
        outcome: 'cancel',
        namespace: 'test-namespace',
      });
    });

    it('fires failure tracking event when install API call fails', async () => {
      const user = userEvent.setup();
      const error = new Error('install failed');
      mockInstallLSD.mockRejectedValueOnce(error);

      renderModalWithContext({ allModels });

      await user.click(screen.getByRole('button', { name: /create/i }));

      await waitFor(() => {
        expect(mockFireFormTrackingEvent).toHaveBeenCalledWith('Playground Setup', {
          outcome: 'submit',
          success: false,
          error: 'unknown_error',
          namespace: 'test-namespace',
        });
      });
    });

    it('fires success tracking with countEmbeddingModels=1 when an embedding model is included via vector store', async () => {
      const user = userEvent.setup();
      const chatModel = createAIModel({ model_name: 'chat-model' });
      const embeddingModel = createAIModel({
        model_name: 'embed-model',
        model_id: 'embed-model',
        model_type: 'embedding',
      });
      const collection: ExternalVectorStoreSummary = {
        vector_store_id: 'vs-1',
        vector_store_name: 'test-vs',
        provider_id: 'provider-1',
        provider_type: 'remote::passthrough',
        embedding_model: 'embed-model',
        embedding_dimension: 768,
      };
      const existingVs: VectorStore = {
        id: 'vs-1',
        name: 'test-vs',
        object: 'vector_store',
        created_at: 1700000000,
        last_active_at: 1700000000,
        file_counts: { cancelled: 0, completed: 0, failed: 0, in_progress: 0, total: 0 },
        metadata: { provider_id: 'provider-1' },
        status: 'completed',
        usage_bytes: 0,
      };
      renderModalWithContext({
        allModels: [chatModel, embeddingModel],
        allCollections: [collection],
        existingCollections: [existingVs],
      });

      await user.click(screen.getByRole('button', { name: /create/i }));

      await waitFor(() => {
        expect(mockFireFormTrackingEvent).toHaveBeenCalledWith('Playground Setup', {
          outcome: 'submit',
          success: true,
          namespace: 'test-namespace',
          countModelsSelected: 2,
          countCollectionsSelected: 1,
          countEmbeddingModels: 1,
        });
      });
    });
  });

  describe('Playground Config Update (update mode)', () => {
    const lsdStatus: LlamaStackDistributionModel = {
      name: 'lsd-playground',
      phase: 'Ready',
      version: '0.1.0',
      distributionConfig: {
        activeDistribution: 'rh',
        providers: [],
        availableDistributions: {},
      },
    };

    it('fires Playground Config Update event (not Setup) in update mode on success', async () => {
      const user = userEvent.setup();
      const mockDeleteLSD = jest.fn().mockResolvedValue({ data: null });
      mockUseGenAiAPI.mockReturnValue({
        apiAvailable: true,
        api: { installLSD: mockInstallLSD, deleteLSD: mockDeleteLSD },
      });
      (useTracingEnabled as jest.Mock).mockReturnValue(true);

      renderModalWithContext({
        allModels,
        lsdStatus,
        existingModels: [
          {
            id: 'p/test-model',
            object: 'model',
            created: Date.now(),
            owned_by: 'x',
            modelId: 'test-model',
          },
        ],
      });

      // Introduce an actual change — the submit button is disabled without one
      await user.click(screen.getByTestId('enable-tracing-switch'));
      await user.click(screen.getByTestId('modal-submit-button'));

      await waitFor(() => {
        expect(mockFireFormTrackingEvent).toHaveBeenCalledWith('Playground Config Update', {
          outcome: 'submit',
          success: true,
          namespace: 'test-namespace',
          countModelsSelected: 1,
          countCollectionsSelected: 0,
          countEmbeddingModels: 0,
          countPreviousModelsSelected: 1,
        });
      });
    });

    it('recreates an existing playground without installation-time max_tokens', async () => {
      const user = userEvent.setup();
      const mockDeleteLSD = jest.fn().mockResolvedValue({ data: null });
      mockUseGenAiAPI.mockReturnValue({
        apiAvailable: true,
        api: { installLSD: mockInstallLSD, deleteLSD: mockDeleteLSD },
      });
      (useTracingEnabled as jest.Mock).mockReturnValue(true);

      renderModalWithContext({ allModels, lsdStatus });

      // Introduce an actual change — the submit button is disabled without one
      await user.click(screen.getByTestId('enable-tracing-switch'));
      await user.click(screen.getByTestId('modal-submit-button'));

      await waitFor(() => {
        expect(mockDeleteLSD).toHaveBeenCalledWith({
          name: 'lsd-playground',
          preserve_vector_store: true,
        });
        expect(mockInstallLSD).toHaveBeenCalledTimes(1);
      });
      expect(mockInstallLSD.mock.calls[0][0].models[0]).not.toHaveProperty('max_tokens');
    });

    it('fires Playground Config Update cancel event in update mode', async () => {
      const user = userEvent.setup();
      renderModalWithContext({ allModels, lsdStatus });

      await user.click(screen.getByRole('button', { name: /cancel/i }));

      expect(mockFireFormTrackingEvent).toHaveBeenCalledWith('Playground Config Update', {
        outcome: 'cancel',
        namespace: 'test-namespace',
      });
    });

    it('calls onUpdateInitiated when an existing playground update is submitted', async () => {
      const user = userEvent.setup();
      const onUpdateInitiated = jest.fn();
      const mockDeleteLSD = jest.fn().mockResolvedValue({ data: null });
      mockUseGenAiAPI.mockReturnValue({
        apiAvailable: true,
        api: { installLSD: mockInstallLSD, deleteLSD: mockDeleteLSD },
      });
      (useTracingEnabled as jest.Mock).mockReturnValue(true);

      renderModalWithContext({ allModels, lsdStatus, onUpdateInitiated });

      // Introduce an actual change — the submit button is disabled without one
      await user.click(screen.getByTestId('enable-tracing-switch'));
      await user.click(screen.getByTestId('modal-submit-button'));

      await waitFor(() => {
        expect(onUpdateInitiated).toHaveBeenCalledTimes(1);
      });
    });

    it('does not call onUpdateInitiated when creating a new playground', async () => {
      const user = userEvent.setup();
      const onUpdateInitiated = jest.fn();

      renderModalWithContext({ allModels, onUpdateInitiated });

      await user.click(screen.getByTestId('modal-submit-button'));

      await waitFor(() => {
        expect(mockInstallLSD).toHaveBeenCalledTimes(1);
      });
      expect(onUpdateInitiated).not.toHaveBeenCalled();
    });
  });
});

// ─── Tracing ──────────────────────────────────────────────────────────────────

describe('ChatbotConfigurationModal tracing configuration', () => {
  const allModels = [createAIModel({ model_name: 'test-model' })];
  const passthroughLsdStatus: LlamaStackDistributionModel = {
    name: 'lsd-playground',
    phase: 'Ready',
    version: '0.1.0',
    distributionConfig: {
      activeDistribution: 'rh',
      providers: [
        {
          provider_id: 'genai-bff-proxy',
          api: 'inference',
          health: { status: 'Ready', message: '' },
        },
      ],
      availableDistributions: {},
    },
  };

  it('does not render tracing toggle when feature flag is disabled', () => {
    (useTracingEnabled as jest.Mock).mockReturnValue(false);
    renderModalWithContext({ allModels });

    expect(screen.queryByTestId('enable-tracing-switch')).not.toBeInTheDocument();
  });

  it('renders tracing toggle when feature flag is enabled', () => {
    (useTracingEnabled as jest.Mock).mockReturnValue(true);
    renderModalWithContext({ allModels });

    expect(screen.getByTestId('enable-tracing-switch')).toBeInTheDocument();
  });

  it('enables Configure when tracing changes for a passthrough playground', async () => {
    const user = userEvent.setup();
    (useTracingEnabled as jest.Mock).mockReturnValue(true);
    renderModalWithContext({ allModels, lsdStatus: passthroughLsdStatus });

    expect(screen.getByTestId('modal-submit-button')).toBeDisabled();

    await user.click(screen.getByTestId('enable-tracing-switch'));

    expect(screen.getByTestId('modal-submit-button')).toBeEnabled();
  });

  it('preserves existing tracing configuration for a passthrough playground', () => {
    (useTracingEnabled as jest.Mock).mockReturnValue(true);
    renderModalWithContext({
      allModels,
      lsdStatus: { ...passthroughLsdStatus, tracingEnabled: true },
    });

    expect(screen.getByTestId('enable-tracing-switch')).toBeChecked();
    expect(screen.getByTestId('modal-submit-button')).toBeDisabled();
  });

  it('does not include enable_tracing in payload when feature flag is disabled', async () => {
    const user = userEvent.setup();
    (useTracingEnabled as jest.Mock).mockReturnValue(false);
    renderModalWithContext({ allModels });

    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(mockInstallLSD).toHaveBeenCalledWith(
        expect.not.objectContaining({ enable_tracing: expect.anything() }),
      );
    });
  });

  it('includes enable_tracing: true in payload when toggle is checked', async () => {
    const user = userEvent.setup();
    (useTracingEnabled as jest.Mock).mockReturnValue(true);
    renderModalWithContext({ allModels });

    await user.click(screen.getByTestId('enable-tracing-switch'));
    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(mockInstallLSD).toHaveBeenCalledWith(
        expect.objectContaining({ enable_tracing: true }),
      );
    });
  });

  it('does not include enable_tracing when toggle is left unchecked', async () => {
    const user = userEvent.setup();
    (useTracingEnabled as jest.Mock).mockReturnValue(true);
    renderModalWithContext({ allModels });

    await user.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(mockInstallLSD).toHaveBeenCalledWith(
        expect.not.objectContaining({ enable_tracing: true }),
      );
    });
  });
});

// ─── Playground restart warning ──────────────────────────────────────────────

describe('ChatbotConfigurationModal playground restart warning', () => {
  const allModels = [createAIModel({ model_name: 'test-model' })];
  const passthroughLsdStatus: LlamaStackDistributionModel = {
    name: 'lsd-playground',
    phase: 'Ready',
    version: '0.1.0',
    distributionConfig: {
      activeDistribution: 'rh',
      providers: [
        {
          provider_id: 'genai-bff-proxy',
          api: 'inference',
          health: { status: 'Ready', message: '' },
        },
      ],
      availableDistributions: {},
    },
  };

  it('shows "Update and restart playground" and the restart alert when tracing changes', async () => {
    const user = userEvent.setup();
    (useTracingEnabled as jest.Mock).mockReturnValue(true);
    renderModalWithContext({ allModels, lsdStatus: passthroughLsdStatus });

    // No changes yet — plain Configure, no alert
    expect(screen.getByTestId('modal-submit-button')).toHaveTextContent('Configure');
    expect(screen.queryByTestId('playground-restart-required-alert')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('enable-tracing-switch'));

    expect(screen.getByTestId('modal-submit-button')).toHaveTextContent(
      'Update and restart playground',
    );
    const alert = screen.getByTestId('playground-restart-required-alert');
    expect(alert).toHaveTextContent('Playground restart required');
    expect(alert).toHaveTextContent(
      'To make this change the playground service will need to restart.',
    );
  });

  it('shows "Update and restart playground" and the restart alert when vector stores change', () => {
    (useAiAssetVectorStoresEnabled as jest.Mock).mockReturnValue(true);
    const embedModel = createAIModel({ model_name: 'embed-model', model_id: 'embed-model' });
    const vs1 = createCollection({ vector_store_id: 'vs-1', embedding_model: 'embed-model' });
    const vs2 = createCollection({ vector_store_id: 'vs-2', embedding_model: 'embed-model' });

    renderModalWithContext({
      allModels: [embedModel],
      allCollections: [vs1, vs2],
      collectionsLoaded: true,
      existingCollections: [createLSDVectorStore('vs-1')],
      // A new store is selected in addition to the existing one
      extraSelectedCollections: [vs2],
      lsdStatus: passthroughLsdStatus,
      initialStepId: 'collections',
    });

    expect(screen.getByTestId('modal-submit-button')).toHaveTextContent(
      'Update and restart playground',
    );
    expect(screen.getByTestId('playground-restart-required-alert')).toBeInTheDocument();
  });

  it('shows plain "Configure" without the restart alert when nothing requires a restart', () => {
    (useAiAssetVectorStoresEnabled as jest.Mock).mockReturnValue(true);
    const embedModel = createAIModel({ model_name: 'embed-model', model_id: 'embed-model' });
    const vs1 = createCollection({ vector_store_id: 'vs-1', embedding_model: 'embed-model' });

    renderModalWithContext({
      allModels: [embedModel],
      allCollections: [vs1],
      collectionsLoaded: true,
      existingCollections: [createLSDVectorStore('vs-1')],
      lsdStatus: passthroughLsdStatus,
      initialStepId: 'collections',
    });

    expect(screen.getByTestId('modal-submit-button')).toHaveTextContent('Configure');
    expect(screen.queryByTestId('playground-restart-required-alert')).not.toBeInTheDocument();
  });

  it('does not show the restart alert in create mode', () => {
    renderModalWithContext({ allModels });

    expect(screen.getByTestId('modal-submit-button')).toHaveTextContent('Create');
    expect(screen.queryByTestId('playground-restart-required-alert')).not.toBeInTheDocument();
  });

  describe('Add to playground deselect', () => {
    const embedModel = createAIModel({ model_name: 'embed-model', model_id: 'embed-model' });
    const vs1 = createCollection({ vector_store_id: 'vs-1', embedding_model: 'embed-model' });
    const vs2 = createCollection({ vector_store_id: 'vs-2', embedding_model: 'embed-model' });

    const renderAddToPlayground = (lsdStatus: LlamaStackDistributionModel) => {
      (useAiAssetVectorStoresEnabled as jest.Mock).mockReturnValue(true);
      renderModalWithContext({
        allModels: [embedModel],
        allCollections: [vs1, vs2],
        collectionsLoaded: true,
        existingCollections: [createLSDVectorStore('vs-1')],
        // Opened via "Add to playground" on the vs-2 row
        extraSelectedCollections: [vs2],
        lsdStatus,
        initialStepId: 'collections',
      });
    };

    it('disables the submit button when the added vector store is deselected again (passthrough playground)', async () => {
      const user = userEvent.setup();
      renderAddToPlayground(passthroughLsdStatus);

      const submitButton = screen.getByTestId('modal-submit-button');
      expect(submitButton).toBeEnabled();
      expect(submitButton).toHaveTextContent('Update and restart playground');

      await user.click(screen.getByRole('button', { name: 'Deselect vs-2' }));

      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent('Configure');
      expect(screen.queryByTestId('playground-restart-required-alert')).not.toBeInTheDocument();
    });

    it('disables the submit button when the added vector store is deselected again (playground without passthrough provider)', async () => {
      const user = userEvent.setup();
      const nonPassthroughLsdStatus: LlamaStackDistributionModel = {
        ...passthroughLsdStatus,
        distributionConfig: {
          ...passthroughLsdStatus.distributionConfig,
          providers: [],
        },
      };
      renderAddToPlayground(nonPassthroughLsdStatus);

      const submitButton = screen.getByTestId('modal-submit-button');
      expect(submitButton).toBeEnabled();

      await user.click(screen.getByRole('button', { name: 'Deselect vs-2' }));

      expect(submitButton).toBeDisabled();
      expect(screen.queryByTestId('playground-restart-required-alert')).not.toBeInTheDocument();
    });

    it('disables the submit button after deselecting when the playground has non-AAE vector stores registered', async () => {
      const user = userEvent.setup();
      (useAiAssetVectorStoresEnabled as jest.Mock).mockReturnValue(true);
      // The LSD vector store list also contains the auto-provisioned
      // document-upload store, which is not an AAE collection and can never
      // be part of the selection
      renderModalWithContext({
        allModels: [embedModel],
        allCollections: [vs1, vs2],
        collectionsLoaded: true,
        existingCollections: [createLSDVectorStore('vs-1'), createLSDVectorStore('user-doc-store')],
        extraSelectedCollections: [vs2],
        lsdStatus: passthroughLsdStatus,
        initialStepId: 'collections',
      });

      const submitButton = screen.getByTestId('modal-submit-button');
      expect(submitButton).toBeEnabled();
      expect(submitButton).toHaveTextContent('Update and restart playground');

      await user.click(screen.getByRole('button', { name: 'Deselect vs-2' }));

      expect(submitButton).toBeDisabled();
      expect(submitButton).toHaveTextContent('Configure');
      expect(screen.queryByTestId('playground-restart-required-alert')).not.toBeInTheDocument();
    });
  });
});
