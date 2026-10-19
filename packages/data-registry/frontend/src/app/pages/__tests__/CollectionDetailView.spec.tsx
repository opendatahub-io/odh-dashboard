import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import type { CollectionDetail } from '~/app/hooks/useCollectionDetail';
import * as trackingHook from '~/app/hooks/useDataRegistryTrackEvent';
import CollectionDetailView from '~/app/pages/CollectionDetailView';

jest.mock('~/app/hooks/useDataRegistryTrackEvent');

const mockTrackEvent = jest.fn();

const mockCollectionDetail: CollectionDetail = {
  name: 'test-collection',
  description: 'Test collection description',
  owner: 'test-owner',
  createdAt: '2026-01-01T00:00:00Z',
  createdBy: 'test-user',
  structuredCount: 2,
  unstructuredCount: 1,
  assets: [
    { name: 'table1', assetType: 'table', format: 'iceberg' },
    { name: 'table2', assetType: 'table', format: 'delta' },
    { name: 'volume1', assetType: 'volume', format: 'external' },
  ],
};

describe('CollectionDetailView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(trackingHook.useDataRegistryTrackEvent).mockReturnValue(mockTrackEvent);
  });

  it('should render collection details card', () => {
    render(
      <BrowserRouter>
        <CollectionDetailView collection={mockCollectionDetail} project="demo-user-1" />
      </BrowserRouter>,
    );

    expect(screen.getByTestId('collection-details-card')).toBeInTheDocument();
    expect(screen.getByTestId('collection-structured-count')).toHaveTextContent('2');
    expect(screen.getByTestId('collection-unstructured-count')).toHaveTextContent('1');
    expect(screen.getByTestId('collection-owner')).toHaveTextContent('test-owner');
    expect(screen.getByTestId('collection-created-at')).toBeInTheDocument();
  });

  it('should render data assets table with correct assets', () => {
    render(
      <BrowserRouter>
        <CollectionDetailView collection={mockCollectionDetail} project="demo-user-1" />
      </BrowserRouter>,
    );

    expect(screen.getByTestId('data-assets-card')).toBeInTheDocument();
    expect(screen.getByTestId('collection-assets-table')).toBeInTheDocument();

    // Verify asset names are rendered as links
    expect(screen.getByText('table1')).toBeInTheDocument();
    expect(screen.getByText('table2')).toBeInTheDocument();
    expect(screen.getByText('volume1')).toBeInTheDocument();
  });

  it('should show correct asset types', () => {
    render(
      <BrowserRouter>
        <CollectionDetailView collection={mockCollectionDetail} project="demo-user-1" />
      </BrowserRouter>,
    );

    // Table assets should show "Structured"
    const rows = screen.getByTestId('collection-assets-table').querySelectorAll('tbody tr');
    expect(rows[0]).toHaveTextContent('Structured');
    expect(rows[1]).toHaveTextContent('Structured');
    expect(rows[2]).toHaveTextContent('Unstructured');
  });

  it('should display empty state when no assets', () => {
    const emptyCollection: CollectionDetail = {
      ...mockCollectionDetail,
      assets: [],
      structuredCount: 0,
      unstructuredCount: 0,
    };

    const onRegisterData = jest.fn();
    render(
      <BrowserRouter>
        <CollectionDetailView
          collection={emptyCollection}
          project="demo-user-1"
          onRegisterData={onRegisterData}
        />
      </BrowserRouter>,
    );

    expect(screen.getByTestId('collection-assets-empty-state')).toBeInTheDocument();
    expect(screen.getByText('No data assets')).toBeInTheDocument();
    expect(
      screen.getByText(
        'To help users in your organization discover and understand external data, create a data asset. Data assets are metadata records that store information like location, format, and schema, but not the data itself.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByTestId('collection-empty-register-data-button')).toBeInTheDocument();
    expect(screen.queryByTestId('collection-assets-table')).not.toBeInTheDocument();
  });

  it('should link to table detail pages', () => {
    render(
      <BrowserRouter>
        <CollectionDetailView collection={mockCollectionDetail} project="demo-user-1" />
      </BrowserRouter>,
    );

    const table1Link = screen.getByText('table1').closest('a');
    expect(table1Link).toHaveAttribute(
      'href',
      '/ai-hub/data/browse/assets/table/demo-user-1/test-collection/table1',
    );
  });

  it('should link to volume detail pages', () => {
    render(
      <BrowserRouter>
        <CollectionDetailView collection={mockCollectionDetail} project="demo-user-1" />
      </BrowserRouter>,
    );

    const volume1Link = screen.getByText('volume1').closest('a');
    expect(volume1Link).toHaveAttribute(
      'href',
      '/ai-hub/data/browse/assets/volume/demo-user-1/test-collection/volume1',
    );
  });

  it('should track asset opens from the link and View details action', () => {
    render(
      <BrowserRouter>
        <CollectionDetailView collection={mockCollectionDetail} project="demo-user-1" />
      </BrowserRouter>,
    );

    fireEvent.click(screen.getByText('table1'));
    expect(mockTrackEvent).toHaveBeenCalledWith({
      eventName: 'Data Asset Opened',
      properties: { project: 'demo-user-1' },
    });

    fireEvent.click(screen.getByTestId('asset-kebab-table1'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'View details' }));
    expect(mockTrackEvent).toHaveBeenCalledTimes(2);
  });

  it('should display created timestamp with user', () => {
    render(
      <BrowserRouter>
        <CollectionDetailView collection={mockCollectionDetail} project="demo-user-1" />
      </BrowserRouter>,
    );

    const createdSection = screen.getByTestId('collection-created-at');
    expect(createdSection).toHaveTextContent('by test-user');
  });

  it('should handle missing createdBy gracefully', () => {
    const collectionWithoutCreatedBy: CollectionDetail = {
      ...mockCollectionDetail,
      createdBy: '',
    };

    render(
      <BrowserRouter>
        <CollectionDetailView collection={collectionWithoutCreatedBy} project="demo-user-1" />
      </BrowserRouter>,
    );

    const createdSection = screen.getByTestId('collection-created-at');
    expect(createdSection).not.toHaveTextContent('by');
  });
});
