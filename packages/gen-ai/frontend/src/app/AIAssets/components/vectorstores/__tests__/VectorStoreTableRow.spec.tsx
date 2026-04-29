/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { ExternalVectorStoreSummary, AIModel, LlamaModel, VectorStore } from '~/app/types';
import VectorStoreTableRow from '~/app/AIAssets/components/vectorstores/VectorStoreTableRow';
import { GenAiContext } from '~/app/context/GenAiContext';
import { mockGenAiContextValue } from '~/__mocks__/mockGenAiContext';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
}));

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: jest.fn(() => jest.fn()),
}));

jest.mock('~/app/utilities/utils', () => ({
  ...jest.requireActual('~/app/utilities/utils'),
  computeEmbeddingModelStatus: jest.fn(() => 'registered'),
}));

jest.mock('~/app/Chatbot/components/chatbotConfiguration/ChatbotConfigurationModal', () => ({
  __esModule: true,
  default: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="chatbot-configuration-modal">
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));

jest.mock('../VectorStoreTableRowInfo', () => ({
  __esModule: true,
  default: ({ store }: { store: ExternalVectorStoreSummary }) => (
    <span data-testid="row-info">{store.vector_store_name}</span>
  ),
}));

const mockFireMiscTrackingEvent = jest.mocked(fireMiscTrackingEvent);

const createStore = (
  overrides?: Partial<ExternalVectorStoreSummary>,
): ExternalVectorStoreSummary => ({
  vector_store_id: 'vs-test-1',
  vector_store_name: 'Test Store',
  provider_id: 'milvus-provider',
  provider_type: 'inline::milvus',
  embedding_model: 'embed-model',
  embedding_dimension: 768,
  ...overrides,
});

const createAIModel = (overrides?: Partial<AIModel>): AIModel => ({
  model_name: 'embed-model',
  model_id: 'embed-model',
  display_name: 'Embed Model',
  serving_runtime: 'kserve',
  api_protocol: 'v2',
  version: 'v1',
  usecase: 'embedding',
  description: '',
  endpoints: [],
  status: 'Running',
  sa_token: { name: '', token_name: '', token: '' },
  model_source_type: 'namespace',
  ...overrides,
});

const createLlamaModel = (overrides?: Partial<LlamaModel>): LlamaModel => ({
  id: 'embed-model',
  object: 'model',
  created: 0,
  owned_by: 'test',
  modelId: 'embed-model',
  ...overrides,
});

const createVectorStore = (id: string, overrides?: Partial<VectorStore>): VectorStore => ({
  id,
  name: 'Test',
  created_at: 0,
  last_active_at: 0,
  object: 'vector_store',
  status: 'completed',
  usage_bytes: 0,
  file_counts: { cancelled: 0, completed: 0, failed: 0, in_progress: 0, total: 0 },
  metadata: { provider_id: 'milvus' },
  ...overrides,
});

const renderRow = (props?: {
  store?: ExternalVectorStoreSummary;
  existingCollections?: VectorStore[];
}) => {
  const store = props?.store ?? createStore();
  const existingCollections = props?.existingCollections ?? [];

  return render(
    <GenAiContext.Provider value={mockGenAiContextValue}>
      <MemoryRouter>
        <table>
          <tbody>
            <VectorStoreTableRow
              store={store}
              allModels={[createAIModel()]}
              playgroundModels={[createLlamaModel()]}
              lsdStatus={null}
              allCollections={[store]}
              collectionsLoaded
              existingCollections={existingCollections}
            />
          </tbody>
        </table>
      </MemoryRouter>
    </GenAiContext.Provider>,
  );
};

describe('VectorStoreTableRow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Available Endpoints Playground Launched tracking', () => {
    it('fires tracking event when "Try in playground" button is clicked', () => {
      renderRow({ existingCollections: [createVectorStore('vs-test-1')] });

      const button = screen.getByRole('button', { name: /try in playground/i });
      fireEvent.click(button);

      expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith(
        'Available Endpoints Playground Launched',
        {
          assetType: 'vector_store',
          assetId: 'vs-test-1',
        },
      );
    });

    it('fires tracking event when "Add to playground" button is clicked', () => {
      renderRow({ existingCollections: [] });

      const button = screen.getByRole('button', { name: /add to playground/i });
      fireEvent.click(button);

      expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith(
        'Available Endpoints Playground Launched',
        {
          assetType: 'vector_store',
          assetId: 'vs-test-1',
        },
      );
    });
  });

  describe('Available Endpoints Missing Model Alert Viewed tracking', () => {
    it('fires tracking event when hovering over the missing-model icon', () => {
      const { computeEmbeddingModelStatus } = jest.requireMock('~/app/utilities/utils');
      computeEmbeddingModelStatus.mockReturnValueOnce('not_available');

      renderRow();

      const tooltipTrigger = screen.getByTestId('missing-model-tooltip-trigger');
      fireEvent.mouseEnter(tooltipTrigger);

      expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith(
        'Available Endpoints Missing Model Alert Viewed',
        {
          collectionName: 'Test Store',
          missingModelId: 'embed-model',
        },
      );
    });
  });
});
