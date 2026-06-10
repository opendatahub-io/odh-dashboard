/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { ExternalVectorStoreSummary } from '~/app/types';
import VectorStoreTableRowInfo from '~/app/AIAssets/components/vectorstores/VectorStoreTableRowInfo';

jest.mock('@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils', () => ({
  fireMiscTrackingEvent: jest.fn(),
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

describe('VectorStoreTableRowInfo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Available Endpoints Vector Store Info Viewed tracking', () => {
    it('fires tracking event when info button is clicked to open', () => {
      render(<VectorStoreTableRowInfo store={createStore()} />);

      fireEvent.click(screen.getByRole('button', { name: /more info/i }));

      expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith(
        'Available Endpoints Vector Store Info Viewed',
        {
          collectionName: 'Test Store',
          providerType: 'inline::milvus',
        },
      );
    });

    it('does not fire tracking event when info button is clicked to close', () => {
      render(<VectorStoreTableRowInfo store={createStore()} />);

      const button = screen.getByRole('button', { name: /more info/i });
      fireEvent.click(button); // open
      mockFireMiscTrackingEvent.mockClear();
      fireEvent.click(button); // close

      expect(mockFireMiscTrackingEvent).not.toHaveBeenCalled();
    });

    it('fires tracking event with correct store details for a different store', () => {
      render(
        <VectorStoreTableRowInfo
          store={createStore({
            vector_store_name: 'Prod Store',
            provider_type: 'remote::pgvector',
          })}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: /more info/i }));

      expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith(
        'Available Endpoints Vector Store Info Viewed',
        {
          collectionName: 'Prod Store',
          providerType: 'remote::pgvector',
        },
      );
    });
  });

  describe('Available Endpoints Vector Store Info Copied tracking', () => {
    beforeEach(() => {
      // Open the popover so clipboard copy buttons are rendered
      render(<VectorStoreTableRowInfo store={createStore()} />);
      fireEvent.click(screen.getByRole('button', { name: /more info/i }));
      mockFireMiscTrackingEvent.mockClear();
    });

    it('fires tracking event with copyTarget provider_id when provider ID copy button is clicked', () => {
      fireEvent.click(screen.getByRole('button', { name: /copy provider id/i }));

      expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith(
        'Available Endpoints Vector Store Info Copied',
        {
          copyTarget: 'provider_id',
          collectionName: 'Test Store',
        },
      );
    });

    it('fires tracking event with copyTarget provider_type when provider type copy button is clicked', () => {
      fireEvent.click(screen.getByRole('button', { name: /copy provider type/i }));

      expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith(
        'Available Endpoints Vector Store Info Copied',
        {
          copyTarget: 'provider_type',
          collectionName: 'Test Store',
        },
      );
    });

    it('fires tracking event with copyTarget vector_store_id when vector store ID copy button is clicked', () => {
      // PF ClipboardCopy's copy button name comes from hoverTip ("Copy ID") + input label
      fireEvent.click(screen.getByRole('button', { name: /^copy id/i }));

      expect(mockFireMiscTrackingEvent).toHaveBeenCalledWith(
        'Available Endpoints Vector Store Info Copied',
        {
          copyTarget: 'vector_store_id',
          collectionName: 'Test Store',
        },
      );
    });
  });
});
