/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { ExternalVectorStoreSummary } from '~/app/types';
import ChatbotConfigurationCollectionsTable from '~/app/Chatbot/components/chatbotConfiguration/ChatbotConfigurationCollectionsTable';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
}));

jest.mock('~/app/hooks/useFetchLlamaModels', () => ({
  __esModule: true,
  default: jest.fn(() => ({ data: [] })),
}));

jest.mock('~/app/utilities/utils', () => ({
  splitLlamaModelId: jest.fn((id: string) => ({ providerId: '', id })),
}));

// Mock mod-arch-shared: provide simplified Table, CheckboxTd, and useCheckboxTableBase
jest.mock('mod-arch-shared', () => {
  const actual = jest.requireActual<typeof import('mod-arch-shared')>('mod-arch-shared');
  return {
    ...actual,
    useCheckboxTableBase: jest.fn(),
    Table: ({
      data,
      rowRenderer,
    }: {
      data: ExternalVectorStoreSummary[];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      rowRenderer: (item: ExternalVectorStoreSummary) => any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      [key: string]: any;
    }) => (
      <table>
        <tbody>{data.map((item) => rowRenderer(item))}</tbody>
      </table>
    ),
    CheckboxTd: ({
      isChecked,
      onToggle,
      'data-testid': testId,
    }: {
      isChecked: boolean;
      onToggle: () => void;
      'data-testid'?: string;
    }) => (
      <td>
        <input type="checkbox" checked={isChecked} onChange={onToggle} data-testid={testId} />
      </td>
    ),
    checkboxTableColumn: () => ({ label: 'checkbox', field: 'select', sortable: false }),
    DashboardEmptyTableView: () => <div data-testid="empty-table-view" />,
  };
});

const { useCheckboxTableBase } = jest.requireMock('mod-arch-shared');
const mockFireMiscTrackingEvent = jest.mocked(fireMiscTrackingEvent);

const createCollection = (
  overrides?: Partial<ExternalVectorStoreSummary>,
): ExternalVectorStoreSummary => ({
  vector_store_id: 'vs-1',
  vector_store_name: 'Test Store',
  provider_id: 'milvus-provider',
  provider_type: 'inline::milvus',
  embedding_model: 'embed-model',
  embedding_dimension: 768,
  ...overrides,
});

const renderTable = (props: {
  allCollections: ExternalVectorStoreSummary[];
  selectedCollections: ExternalVectorStoreSummary[];
  selectedForIsSelected?: ExternalVectorStoreSummary[];
}) => {
  const setSelectedCollections = jest.fn();

  // isSelected reflects selectedForIsSelected (defaults to selectedCollections)
  const selectionSet = new Set(
    (props.selectedForIsSelected ?? props.selectedCollections).map((c) => c.vector_store_id),
  );
  useCheckboxTableBase.mockReturnValue({
    tableProps: {},
    isSelected: (c: ExternalVectorStoreSummary) => selectionSet.has(c.vector_store_id),
    toggleSelection: jest.fn(),
  });

  return render(
    <ChatbotConfigurationCollectionsTable
      allCollections={props.allCollections}
      selectedCollections={props.selectedCollections}
      setSelectedCollections={setSelectedCollections}
    />,
  );
};

describe('ChatbotConfigurationCollectionsTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Playground Collection Selected tracking', () => {
    it('fires tracking event with isSelected:true and countSelectedCollections:1 when selecting from empty state', () => {
      const collection = createCollection({
        vector_store_id: 'vs-1',
        vector_store_name: 'Test Store',
        provider_type: 'inline::milvus',
      });
      renderTable({
        allCollections: [collection],
        selectedCollections: [], // nothing selected yet
        selectedForIsSelected: [], // hook says not selected
      });

      fireEvent.click(screen.getByTestId('vs-1-checkbox'));

      expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith('Playground Collection Selected', {
        collectionName: 'Test Store',
        isSelected: true,
        providerType: 'inline::milvus',
        countSelectedCollections: 1, // 0 + 1
      });
    });

    it('fires tracking event with isSelected:false and countSelectedCollections:0 when deselecting the only selected item', () => {
      const collection = createCollection({
        vector_store_id: 'vs-1',
        vector_store_name: 'Test Store',
        provider_type: 'inline::milvus',
      });
      renderTable({
        allCollections: [collection],
        selectedCollections: [collection], // 1 currently selected
        selectedForIsSelected: [collection], // hook says it IS selected
      });

      fireEvent.click(screen.getByTestId('vs-1-checkbox'));

      expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith('Playground Collection Selected', {
        collectionName: 'Test Store',
        isSelected: false,
        providerType: 'inline::milvus',
        countSelectedCollections: 0, // 1 - 1
      });
    });

    it('fires tracking event with correct collectionName and providerType for a different store', () => {
      const collection = createCollection({
        vector_store_id: 'vs-other',
        vector_store_name: 'Prod Store',
        provider_type: 'remote::pgvector',
      });
      renderTable({
        allCollections: [collection],
        selectedCollections: [],
        selectedForIsSelected: [],
      });

      fireEvent.click(screen.getByTestId('vs-other-checkbox'));

      expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith('Playground Collection Selected', {
        collectionName: 'Prod Store',
        isSelected: true,
        providerType: 'remote::pgvector',
        countSelectedCollections: 1,
      });
    });

    it('fires tracking event with countSelectedCollections:2 when adding a second item to a list of 1', () => {
      const c1 = createCollection({ vector_store_id: 'vs-1', vector_store_name: 'Store 1' });
      const c2 = createCollection({ vector_store_id: 'vs-2', vector_store_name: 'Store 2' });
      renderTable({
        allCollections: [c1, c2],
        selectedCollections: [c1], // 1 already selected
        selectedForIsSelected: [], // the second one is NOT selected
      });

      fireEvent.click(screen.getByTestId('vs-2-checkbox'));

      expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith('Playground Collection Selected', {
        collectionName: 'Store 2',
        isSelected: true,
        providerType: 'inline::milvus',
        countSelectedCollections: 2, // 1 + 1
      });
    });
  });
});
