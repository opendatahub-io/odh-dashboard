/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import {
  AIModel,
  ExternalVectorStoreSummary,
  LlamaModel,
  LlamaStackDistributionModel,
  VectorStore,
} from '~/app/types';
import type { MaaSModel } from '~/app/types';
import ChatbotConfigurationModal from '~/app/Chatbot/components/chatbotConfiguration/ChatbotConfigurationModal';
import useGuardrailsEnabled from '~/app/Chatbot/hooks/useGuardrailsEnabled';
import { useGenAiAPI } from '~/app/hooks/useGenAiAPI';
import useAiAssetVectorStoresEnabled from '~/app/hooks/useAiAssetVectorStoresEnabled';
import { GenAiContext } from '~/app/context/GenAiContext';
import { mockGenAiContextValue } from '~/__mocks__/mockGenAiContext';

jest.mock('~/app/Chatbot/hooks/useGuardrailsEnabled');
jest.mock('~/app/hooks/useGenAiAPI');
jest.mock('~/app/hooks/useAiAssetVectorStoresEnabled');

const mockInstallLSD = jest.fn();
const mockInitNemoGuardrails = jest.fn();
const mockUseGenAiAPI = useGenAiAPI as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();

  (useGuardrailsEnabled as jest.Mock).mockReturnValue(false);
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
  default: ({
    selectedModels,
    maxTokensMap,
  }: {
    selectedModels: AIModel[];
    maxTokensMap: Map<string, number | undefined>;
  }) => (
    <div data-testid="selected-models">
      {JSON.stringify({
        models: selectedModels.map((m) => m.model_name),
        maxTokens: Array.from(maxTokensMap.entries()),
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
      allCollections,
    }: {
      selectedCollections: ExternalVectorStoreSummary[];
      allCollections: ExternalVectorStoreSummary[];
    }) => (
      <div data-testid="collections-table">
        {JSON.stringify({
          selected: selectedCollections.map((c) => c.vector_store_id),
          all: allCollections.map((c) => c.vector_store_id),
        })}
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
  sa_token: { name: '', token_name: '', token: '' },
  model_source_type: 'namespace',
  ...overrides,
});

const createMaaSModel = (overrides: Partial<MaaSModel>): MaaSModel => ({
  id: 'maas-model',
  object: 'model',
  created: Date.now(),
  owned_by: 'maas',
  ready: true,
  url: 'https://maas.example.com/v1',
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
  maasModels?: MaaSModel[];
  existingModels?: LlamaModel[];
  extraSelectedModels?: AIModel[];
  allCollections?: ExternalVectorStoreSummary[];
  collectionsLoaded?: boolean;
  existingCollections?: VectorStore[];
  extraSelectedCollections?: ExternalVectorStoreSummary[];
  lsdStatus?: LlamaStackDistributionModel | null;
  initialStepId?: string;
};

const renderModal = (props: RenderModalProps) =>
  render(
    <MemoryRouter>
      <ChatbotConfigurationModal
        onClose={() => undefined}
        lsdStatus={props.lsdStatus ?? null}
        aiModels={props.allModels}
        maasModels={props.maasModels}
        existingModels={props.existingModels}
        extraSelectedModels={props.extraSelectedModels}
        allCollections={props.allCollections ?? []}
        collectionsLoaded={props.collectionsLoaded ?? true}
        existingCollections={props.existingCollections}
        extraSelectedCollections={props.extraSelectedCollections}
        initialStepId={props.initialStepId}
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
          maasModels={props.maasModels}
          existingModels={props.existingModels}
          extraSelectedModels={props.extraSelectedModels}
          allCollections={props.allCollections ?? []}
          collectionsLoaded={props.collectionsLoaded ?? true}
          existingCollections={props.existingCollections}
          extraSelectedCollections={props.extraSelectedCollections}
          initialStepId={props.initialStepId}
        />
      </MemoryRouter>
    </GenAiContext.Provider>,
  );

const getSelectedModelNames = (): string[] => {
  const json = screen.getByTestId('selected-models').textContent || '{}';
  const parsed = JSON.parse(json) as {
    models: string[];
    maxTokens: [string, number | undefined][];
  };
  return parsed.models;
};

const getSelectedCollectionIds = (): string[] => {
  const json = screen.getByTestId('collections-table').textContent || '{}';
  const parsed = JSON.parse(json) as { selected: string[]; all: string[] };
  return parsed.selected;
};

const getAllCollectionIds = (): string[] => {
  const json = screen.getByTestId('collections-table').textContent || '{}';
  const parsed = JSON.parse(json) as { selected: string[]; all: string[] };
  return parsed.all;
};

// ─── Pre-selected models ─────────────────────────────────────────────────────

describe('ChatbotConfigurationModal preSelectedModels', () => {
  const aiA = createAIModel({ model_name: 'mA', display_name: 'A' });
  const aiB = createAIModel({ model_name: 'mB', display_name: 'B' });
  const aiC = createAIModel({ model_name: 'mC', display_name: 'C' });
  const aiD = createAIModel({ model_name: 'mD', display_name: 'D', status: 'Stop' });
  const allModels = [aiA, aiB, aiC, aiD];

  it('uses existing models only when provided (mapped by id ↔ model_name)', () => {
    const existing: LlamaModel[] = [
      { id: 'pA/mA', object: 'model', created: Date.now(), owned_by: 'x', modelId: 'mA' },
      { id: 'pA/mC', object: 'model', created: Date.now(), owned_by: 'x', modelId: 'mC' },
    ];
    renderModal({ allModels, existingModels: existing });
    expect(getSelectedModelNames()).toEqual(['mA', 'mC']);
  });

  it('uses only available existing models (Running status)', () => {
    const existing: LlamaModel[] = [
      { id: 'pA/mA', object: 'model', created: Date.now(), owned_by: 'x', modelId: 'mA' },
      { id: 'pA/mD', object: 'model', created: Date.now(), owned_by: 'x', modelId: 'mD' },
    ];
    renderModal({ allModels, existingModels: existing });
    expect(getSelectedModelNames()).toEqual(['mA']);
  });

  it('merges extraSelectedModels and existingModels, deduplicating by model_name', () => {
    const existing: LlamaModel[] = [
      { id: 'pA/mA', object: 'model', created: Date.now(), owned_by: 'x', modelId: 'mA' },
      { id: 'pA/mC', object: 'model', created: Date.now(), owned_by: 'x', modelId: 'mC' },
    ];
    renderModal({ allModels, existingModels: existing, extraSelectedModels: [aiB] });
    expect(getSelectedModelNames()).toEqual(['mB', 'mA', 'mC']);
  });

  it('extra takes precedence over existing when same model appears in both', () => {
    const existing: LlamaModel[] = [
      { id: 'pA/mA', object: 'model', created: Date.now(), owned_by: 'x', modelId: 'mA' },
      { id: 'pA/mC', object: 'model', created: Date.now(), owned_by: 'x', modelId: 'mC' },
    ];
    renderModal({ allModels, existingModels: existing, extraSelectedModels: [aiB, aiA] });
    expect(getSelectedModelNames()).toEqual(['mB', 'mA', 'mC']);
  });

  it('uses only extraSelectedModels when existingModels is not provided', () => {
    renderModal({ allModels, extraSelectedModels: [aiB] });
    expect(getSelectedModelNames()).toEqual(['mB']);
  });

  it('falls back to allModels when neither existing nor extra are provided', () => {
    renderModal({ allModels });
    expect(getSelectedModelNames()).toEqual(['mA', 'mB', 'mC']);
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
    const maasModel = createMaaSModel({ id: 'granite-7b-lab' });
    renderModal({ allModels: [namespaceModel], maasModels: [maasModel] });
    const names = getSelectedModelNames();
    expect(names).toHaveLength(2);
    expect(names).toContain('granite-7b-lab');
  });
});

// ─── max_tokens ───────────────────────────────────────────────────────────────

describe('ChatbotConfigurationModal max_tokens support', () => {
  it('initialises an empty maxTokensMap', () => {
    renderModal({ allModels: [createAIModel({ model_name: 'test-model' })] });
    const json = screen.getByTestId('selected-models').textContent || '{}';
    const parsed = JSON.parse(json) as { maxTokens: [string, number | undefined][] };
    expect(parsed.maxTokens).toEqual([]);
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
