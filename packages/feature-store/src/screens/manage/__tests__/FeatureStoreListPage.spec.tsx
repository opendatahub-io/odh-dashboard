import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { MemoryRouter } from 'react-router-dom';
import { useAccessAllowed } from '@odh-dashboard/internal/concepts/userSSAR/useAccessAllowed';
import useExistingFeatureStores from '../../../hooks/useExistingFeatureStores';
import { FeatureStoreKind } from '../../../k8sTypes';
import FeatureStoreListPage from '../FeatureStoreListPage';

jest.mock('@odh-dashboard/internal/concepts/userSSAR/useAccessAllowed');
jest.mock('@odh-dashboard/internal/concepts/userSSAR/utils', () => ({
  verbModelAccess: jest.fn((...args: unknown[]) => args),
}));
jest.mock('../../../hooks/useExistingFeatureStores');
jest.mock('@odh-dashboard/ui-core', () => ({
  ApplicationsPage: ({
    children,
    empty,
    emptyStatePage,
    loaded,
  }: {
    children: React.ReactNode;
    empty: boolean;
    emptyStatePage: React.ReactNode;
    loaded: boolean;
  }) => <div data-testid="applications-page">{loaded && empty ? emptyStatePage : children}</div>,
  Table: ({
    data,
    rowRenderer,
    toolbarContent,
  }: {
    data: FeatureStoreKind[];
    rowRenderer: (fs: FeatureStoreKind, idx: number) => React.ReactNode;
    toolbarContent: React.ReactNode;
  }) => (
    <div data-testid="table">
      {toolbarContent}
      <table>
        <tbody>{data.map((fs, idx) => rowRenderer(fs, idx))}</tbody>
      </table>
    </div>
  ),
  DashboardEmptyTableView: () => <div data-testid="empty-table-view" />,
  SortableData: {},
}));
jest.mock('../DeleteFeatureStoreModal', () => ({
  __esModule: true,
  default: ({ onClose }: { onClose: (deleted: boolean) => void }) => (
    <div data-testid="delete-modal">
      <button data-testid="confirm-delete" onClick={() => onClose(true)}>
        Confirm
      </button>
      <button data-testid="cancel-delete" onClick={() => onClose(false)}>
        Cancel
      </button>
    </div>
  ),
}));
jest.mock('../FeatureStoreTableRow', () => ({
  __esModule: true,
  default: ({
    featureStore,
    onDelete,
  }: {
    featureStore: FeatureStoreKind;
    onDelete: (fs: FeatureStoreKind) => void;
  }) => (
    <tr data-testid={`row-${featureStore.metadata.name}`}>
      <td>{featureStore.metadata.name}</td>
      <td>
        <button
          data-testid={`delete-${featureStore.metadata.name}`}
          onClick={() => onDelete(featureStore)}
        >
          Delete
        </button>
      </td>
    </tr>
  ),
}));

const useAccessAllowedMock = jest.mocked(useAccessAllowed);
const useExistingFeatureStoresMock = jest.mocked(useExistingFeatureStores);

const makeStore = (name: string, namespace: string): FeatureStoreKind =>
  ({
    apiVersion: 'feast.dev/v1',
    kind: 'FeatureStore',
    metadata: { name, namespace, uid: `${namespace}-${name}`, labels: {} },
    spec: { feastProject: name },
  } as FeatureStoreKind);

describe('FeatureStoreListPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAccessAllowedMock.mockReturnValue([true, true]);
    useExistingFeatureStoresMock.mockReturnValue({
      featureStores: [],
      loaded: true,
      error: undefined,
      existingProjectNames: [],
      existingResourceNames: [],
      hasUILabeledStore: false,
      primaryStore: undefined,
      refresh: jest.fn(),
    });
  });

  it('should show empty state when no feature stores exist', () => {
    render(
      <MemoryRouter>
        <FeatureStoreListPage />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('empty-feature-stores')).toBeInTheDocument();
    expect(screen.getByText('No feature stores yet')).toBeInTheDocument();
  });

  it('should show create button in empty state when user has create permission', () => {
    render(
      <MemoryRouter>
        <FeatureStoreListPage />
      </MemoryRouter>,
    );
    expect(screen.getByTestId('create-feature-store-empty-btn')).toBeInTheDocument();
    expect(screen.getByText('To get started, create a feature store.')).toBeInTheDocument();
  });

  it('should hide create button in empty state when user lacks create permission', () => {
    useAccessAllowedMock.mockReturnValue([false, true]);
    render(
      <MemoryRouter>
        <FeatureStoreListPage />
      </MemoryRouter>,
    );
    expect(screen.queryByTestId('create-feature-store-empty-btn')).not.toBeInTheDocument();
  });

  it('should render table with feature stores', () => {
    const stores = [makeStore('store-1', 'ns-1'), makeStore('store-2', 'ns-2')];
    useExistingFeatureStoresMock.mockReturnValue({
      featureStores: stores,
      loaded: true,
      error: undefined,
      existingProjectNames: ['store-1', 'store-2'],
      existingResourceNames: ['store-1', 'store-2'],
      hasUILabeledStore: false,
      primaryStore: undefined,
      refresh: jest.fn(),
    });

    render(
      <MemoryRouter>
        <FeatureStoreListPage />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('row-store-1')).toBeInTheDocument();
    expect(screen.getByTestId('row-store-2')).toBeInTheDocument();
  });

  it('should hide create button in toolbar when user lacks create permission', () => {
    useAccessAllowedMock.mockReturnValue([false, true]);
    const stores = [makeStore('store-1', 'ns-1')];
    useExistingFeatureStoresMock.mockReturnValue({
      featureStores: stores,
      loaded: true,
      error: undefined,
      existingProjectNames: ['store-1'],
      existingResourceNames: ['store-1'],
      hasUILabeledStore: false,
      primaryStore: undefined,
      refresh: jest.fn(),
    });

    render(
      <MemoryRouter>
        <FeatureStoreListPage />
      </MemoryRouter>,
    );

    expect(screen.queryByTestId('create-feature-store-toolbar-btn')).not.toBeInTheDocument();
  });

  it('should show create button in toolbar when user has create permission', () => {
    const stores = [makeStore('store-1', 'ns-1')];
    useExistingFeatureStoresMock.mockReturnValue({
      featureStores: stores,
      loaded: true,
      error: undefined,
      existingProjectNames: ['store-1'],
      existingResourceNames: ['store-1'],
      hasUILabeledStore: false,
      primaryStore: undefined,
      refresh: jest.fn(),
    });

    render(
      <MemoryRouter>
        <FeatureStoreListPage />
      </MemoryRouter>,
    );

    expect(screen.getByTestId('create-feature-store-toolbar-btn')).toBeInTheDocument();
  });

  it('should open delete modal when delete action is clicked', async () => {
    const stores = [makeStore('store-1', 'ns-1')];
    useExistingFeatureStoresMock.mockReturnValue({
      featureStores: stores,
      loaded: true,
      error: undefined,
      existingProjectNames: ['store-1'],
      existingResourceNames: ['store-1'],
      hasUILabeledStore: false,
      primaryStore: undefined,
      refresh: jest.fn(),
    });

    const { getByTestId } = render(
      <MemoryRouter>
        <FeatureStoreListPage />
      </MemoryRouter>,
    );

    const user = userEvent.setup();
    await user.click(getByTestId('delete-store-1'));
    expect(screen.getByTestId('delete-modal')).toBeInTheDocument();
  });

  it('should close delete modal and refresh on confirmed delete', async () => {
    const refreshMock = jest.fn();
    const stores = [makeStore('store-1', 'ns-1')];
    useExistingFeatureStoresMock.mockReturnValue({
      featureStores: stores,
      loaded: true,
      error: undefined,
      existingProjectNames: ['store-1'],
      existingResourceNames: ['store-1'],
      hasUILabeledStore: false,
      primaryStore: undefined,
      refresh: refreshMock,
    });

    const { getByTestId } = render(
      <MemoryRouter>
        <FeatureStoreListPage />
      </MemoryRouter>,
    );

    const user = userEvent.setup();
    await user.click(getByTestId('delete-store-1'));
    await user.click(getByTestId('confirm-delete'));
    expect(refreshMock).toHaveBeenCalled();
    expect(screen.queryByTestId('delete-modal')).not.toBeInTheDocument();
  });

  it('should close delete modal without refresh on cancel', async () => {
    const refreshMock = jest.fn();
    const stores = [makeStore('store-1', 'ns-1')];
    useExistingFeatureStoresMock.mockReturnValue({
      featureStores: stores,
      loaded: true,
      error: undefined,
      existingProjectNames: ['store-1'],
      existingResourceNames: ['store-1'],
      hasUILabeledStore: false,
      primaryStore: undefined,
      refresh: refreshMock,
    });

    const { getByTestId } = render(
      <MemoryRouter>
        <FeatureStoreListPage />
      </MemoryRouter>,
    );

    const user = userEvent.setup();
    await user.click(getByTestId('delete-store-1'));
    await user.click(getByTestId('cancel-delete'));
    expect(refreshMock).not.toHaveBeenCalled();
    expect(screen.queryByTestId('delete-modal')).not.toBeInTheDocument();
  });
});
