import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import * as useCollectionDetailHook from '~/app/hooks/useCollectionDetail';
import * as useAssetsHook from '~/app/hooks/useAssets';
import * as useCollectionsHook from '~/app/hooks/useCollections';
import * as useConnectionsHook from '~/app/hooks/useConnections';
import * as useLabelsHook from '~/app/hooks/useLabels';
import type { CollectionDetail } from '~/app/hooks/useCollectionDetail';
import CollectionDetailPage from '~/app/pages/CollectionDetailPage';

jest.mock('~/app/hooks/useCollectionDetail');
jest.mock('~/app/hooks/useAssets');
jest.mock('~/app/hooks/useCollections');
jest.mock('~/app/hooks/useConnections');
jest.mock('~/app/hooks/useLabels');
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

describe('CollectionDetailPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    jest
      .mocked(useCollectionDetailHook.useCollectionDetail)
      .mockReturnValue([mockCollectionDetail, true, undefined, jest.fn()]);
    jest.mocked(useAssetsHook.useAssets).mockReturnValue([[], true, undefined, jest.fn(), []]);
    jest
      .mocked(useCollectionsHook.useCollections)
      .mockReturnValue([[], true, undefined, jest.fn()]);
    jest
      .mocked(useConnectionsHook.useConnections)
      .mockReturnValue([[], true, undefined, jest.fn().mockResolvedValue([]), []]);
    jest.mocked(useLabelsHook.useLabels).mockReturnValue([[], true, undefined, jest.fn()]);
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
    expect(deleteAction).toHaveClass('pf-m-aria-disabled');
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
    expect(deleteAction).not.toHaveClass('pf-m-aria-disabled');
    expect(deleteAction).not.toHaveAttribute('aria-disabled');
  });

  it('should disable write actions when the user lacks write access', () => {
    jest
      .mocked(useAssetsHook.useAssets)
      .mockReturnValue([[], true, new Error('Access forbidden'), jest.fn(), []]);

    render(
      <BrowserRouter>
        <CollectionDetailPage />
      </BrowserRouter>,
    );

    fireEvent.click(screen.getByTestId('collection-actions-toggle'));

    expect(screen.getByTestId('collection-action-register-data')).toHaveClass('pf-m-disabled');
    expect(screen.getByTestId('collection-action-delete')).toHaveClass('pf-m-disabled');
    expect(screen.getByTestId('collection-action-manage-collections')).toHaveClass('pf-m-disabled');
  });

  it('should disable write actions when collection loading returns a forbidden error', () => {
    jest
      .mocked(useCollectionDetailHook.useCollectionDetail)
      .mockReturnValue([mockCollectionDetail, true, new Error('Access forbidden'), jest.fn()]);
    jest
      .mocked(useAssetsHook.useAssets)
      .mockReturnValue([[], true, new Error('Failed to load assets'), jest.fn(), []]);

    render(
      <BrowserRouter>
        <CollectionDetailPage />
      </BrowserRouter>,
    );

    fireEvent.click(screen.getByTestId('collection-actions-toggle'));

    expect(screen.getByTestId('collection-action-register-data')).toHaveClass('pf-m-disabled');
    expect(screen.getByTestId('collection-action-delete')).toHaveClass('pf-m-disabled');
    expect(screen.getByTestId('collection-action-manage-collections')).toHaveClass('pf-m-disabled');
  });

  it('should disable registration from the empty state when the user lacks write access', () => {
    const emptyCollectionDetail: CollectionDetail = {
      ...mockCollectionDetail,
      assets: [],
      structuredCount: 0,
      unstructuredCount: 0,
    };

    jest
      .mocked(useCollectionDetailHook.useCollectionDetail)
      .mockReturnValue([emptyCollectionDetail, true, undefined, jest.fn()]);
    jest
      .mocked(useAssetsHook.useAssets)
      .mockReturnValue([[], true, new Error('Access forbidden'), jest.fn(), []]);

    render(
      <BrowserRouter>
        <CollectionDetailPage />
      </BrowserRouter>,
    );

    expect(screen.getByTestId('collection-empty-register-data-button')).toBeDisabled();
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

  it('should open register data modal from actions dropdown', async () => {
    render(
      <BrowserRouter>
        <CollectionDetailPage />
      </BrowserRouter>,
    );

    fireEvent.click(screen.getByTestId('collection-actions-toggle'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Register data' }));

    await waitFor(() => expect(screen.getByText('Create data asset')).toBeInTheDocument());
  });

  it('should return to registration with form values after managing labels', async () => {
    const user = userEvent.setup();
    render(
      <BrowserRouter>
        <CollectionDetailPage />
      </BrowserRouter>,
    );

    fireEvent.click(screen.getByTestId('collection-actions-toggle'));
    fireEvent.click(screen.getByRole('menuitem', { name: 'Register data' }));
    await waitFor(() => expect(screen.getByText('Create data asset')).toBeInTheDocument());

    await user.type(screen.getByTestId('data-name-input'), 'asset-under-construction');
    await user.click(screen.getByRole('button', { name: 'Manage labels' }));
    await waitFor(() => expect(screen.getByTestId('manage-labels-modal')).toBeInTheDocument());

    await user.click(screen.getByTestId('manage-labels-close-button'));
    await waitFor(() => expect(screen.getByText('Create data asset')).toBeInTheDocument());
    expect(screen.getByTestId('data-name-input')).toHaveValue('asset-under-construction');
  });
});
