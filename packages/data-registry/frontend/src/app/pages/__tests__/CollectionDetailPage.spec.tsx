import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import * as useCollectionDetailHook from '~/app/hooks/useCollectionDetail';
import * as useAssetsHook from '~/app/hooks/useAssets';
import * as useCollectionsHook from '~/app/hooks/useCollections';
import type { CollectionDetail } from '~/app/hooks/useCollectionDetail';
import type { CollectionInfo } from '~/app/hooks/useCollections';
import CollectionDetailPage from '~/app/pages/CollectionDetailPage';

jest.mock('~/app/hooks/useCollectionDetail');
jest.mock('~/app/hooks/useAssets');
jest.mock('~/app/hooks/useCollections');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({ project: 'demo-user-1', collection: 'default' }),
  useNavigate: () => jest.fn(),
}));

const mockCollectionDetail: CollectionDetail = {
  name: 'default',
  description: 'Test collection',
  owner: 'test-owner',
  createdAt: '2026-01-01T00:00:00Z',
  createdBy: 'test-user',
  structuredCount: 2,
  unstructuredCount: 1,
  assets: [{ name: 'table1', assetType: 'table', format: 'iceberg' }],
};

const mockCollectionInfo: CollectionInfo = {
  name: 'default',
  description: 'Test collection',
  assetNames: ['table1'],
  tableCount: 1,
  volumeCount: 0,
};

describe('CollectionDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    jest
      .mocked(useCollectionDetailHook.useCollectionDetail)
      .mockReturnValue([mockCollectionDetail, true, undefined, jest.fn()]);

    jest
      .mocked(useAssetsHook.useAssets)
      .mockReturnValue([[], true, undefined, jest.fn(), ['default']]);

    jest
      .mocked(useCollectionsHook.useCollections)
      .mockReturnValue([[mockCollectionInfo], true, undefined, jest.fn()]);
  });

  it('should render collection detail page with title and badge', () => {
    render(
      <BrowserRouter>
        <CollectionDetailPage />
      </BrowserRouter>,
    );

    expect(screen.getByTestId('app-page-title')).toHaveTextContent('default');
    expect(screen.getByTestId('collection-type-badge')).toHaveTextContent('Collection');
  });

  it('should display collection description', () => {
    render(
      <BrowserRouter>
        <CollectionDetailPage />
      </BrowserRouter>,
    );

    expect(screen.getByTestId('collection-description')).toHaveTextContent('Test collection');
  });

  it('should display breadcrumb with collection name', () => {
    render(
      <BrowserRouter>
        <CollectionDetailPage />
      </BrowserRouter>,
    );

    const breadcrumb = screen.getByRole('navigation', { name: /breadcrumb/i });
    expect(breadcrumb).toHaveTextContent('default');
  });

  it('should show actions dropdown', () => {
    render(
      <BrowserRouter>
        <CollectionDetailPage />
      </BrowserRouter>,
    );

    const actionsToggle = screen.getByTestId('collection-actions-toggle');
    expect(actionsToggle).toBeInTheDocument();

    fireEvent.click(actionsToggle);

    expect(screen.getByTestId('collection-action-register-data')).toBeInTheDocument();
    expect(screen.getByTestId('collection-action-delete')).toBeInTheDocument();
    expect(screen.getByTestId('collection-action-manage-collections')).toBeInTheDocument();
  });

  it('should disable delete action when collection has assets', () => {
    render(
      <BrowserRouter>
        <CollectionDetailPage />
      </BrowserRouter>,
    );

    fireEvent.click(screen.getByTestId('collection-actions-toggle'));

    const deleteAction = screen.getByTestId('collection-action-delete');
    expect(deleteAction).toHaveClass('pf-m-disabled');
  });

  it('should enable delete action when collection is empty', () => {
    const emptyCollectionDetail: CollectionDetail = {
      ...mockCollectionDetail,
      assets: [],
      structuredCount: 0,
      unstructuredCount: 0,
    };

    jest
      .mocked(useCollectionDetailHook.useCollectionDetail)
      .mockReturnValue([emptyCollectionDetail, true, undefined, jest.fn()]);

    render(
      <BrowserRouter>
        <CollectionDetailPage />
      </BrowserRouter>,
    );

    fireEvent.click(screen.getByTestId('collection-actions-toggle'));

    const deleteAction = screen.getByTestId('collection-action-delete');
    expect(deleteAction).not.toBeDisabled();
  });

  it('should render overview tab by default', () => {
    render(
      <BrowserRouter>
        <CollectionDetailPage />
      </BrowserRouter>,
    );

    expect(screen.getByTestId('detail-tabs')).toBeInTheDocument();
    expect(screen.getByText('Overview')).toBeInTheDocument();
  });

  it('should display loading state', () => {
    jest
      .mocked(useCollectionDetailHook.useCollectionDetail)
      .mockReturnValue([null, false, undefined, jest.fn()]);

    render(
      <BrowserRouter>
        <CollectionDetailPage />
      </BrowserRouter>,
    );

    expect(screen.getByText('Loading')).toBeInTheDocument();
  });

  it('should display error state', () => {
    const error = new Error('Failed to load collection');
    jest
      .mocked(useCollectionDetailHook.useCollectionDetail)
      .mockReturnValue([null, true, error, jest.fn()]);

    render(
      <BrowserRouter>
        <CollectionDetailPage />
      </BrowserRouter>,
    );

    expect(screen.getByText(error.message)).toBeInTheDocument();
  });

  it('should display not found state when collection does not exist', () => {
    jest
      .mocked(useCollectionDetailHook.useCollectionDetail)
      .mockReturnValue([null, true, undefined, jest.fn()]);

    render(
      <BrowserRouter>
        <CollectionDetailPage />
      </BrowserRouter>,
    );

    expect(screen.getByTestId('collection-not-found-empty-state')).toBeInTheDocument();
    expect(screen.getByText('Collection not found')).toBeInTheDocument();
  });

  it('should refresh all data when handleRefresh is called', async () => {
    const refreshCollection = jest.fn();
    const refreshAssets = jest.fn();
    const refreshCollections = jest.fn();

    jest
      .mocked(useCollectionDetailHook.useCollectionDetail)
      .mockReturnValue([mockCollectionDetail, true, undefined, refreshCollection]);

    jest
      .mocked(useAssetsHook.useAssets)
      .mockReturnValue([[], true, undefined, refreshAssets, ['default']]);

    jest
      .mocked(useCollectionsHook.useCollections)
      .mockReturnValue([[mockCollectionInfo], true, undefined, refreshCollections]);

    render(
      <BrowserRouter>
        <CollectionDetailPage />
      </BrowserRouter>,
    );

    fireEvent.click(screen.getByTestId('collection-actions-toggle'));
    fireEvent.click(screen.getByTestId('collection-action-register-data'));

    await waitFor(() => {
      expect(screen.getByText('Register data')).toBeInTheDocument();
    });
  });
});
