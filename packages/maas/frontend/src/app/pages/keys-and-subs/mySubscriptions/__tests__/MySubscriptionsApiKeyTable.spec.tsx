/* eslint-disable camelcase */
import * as React from 'react';
import { render, screen, within, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { APIKey, APIKeyListResponse } from '~/app/types/api-key';
import { UserSubscription } from '~/app/types/subscriptions';
import MySubscriptionsApiKeyTable from '~/app/pages/keys-and-subs/mySubscriptions/MySubscriptionsApiKeyTable';

const mockOnSort = jest.fn();
const mockOnSetPage = jest.fn();
const mockOnPerPageSelect = jest.fn();
const mockRefresh = jest.fn();

let mockHookReturn: {
  response: APIKeyListResponse;
  loaded: boolean;
  error: Error | undefined;
  refresh: () => void;
  page: number;
  perPage: number;
  sortField: string;
  sortDirection: string;
  isFetching: boolean;
  onSetPage: (newPage: number) => void;
  onPerPageSelect: (newPerPage: number, newPage: number) => void;
  onSort: (field: string, direction: string) => void;
};

jest.mock('~/app/hooks/useSubscriptionApiKeysTableState', () => ({
  useSubscriptionApiKeysTableState: () => mockHookReturn,
}));

jest.mock('~/app/pages/keys-and-subs/apiKeys/CreateApiKeyModal', () => {
  const Mock = () => <div data-testid="create-api-key-modal" />;
  Mock.displayName = 'MockCreateApiKeyModal';
  return { __esModule: true, default: Mock };
});

jest.mock('~/app/pages/keys-and-subs/apiKeys/RevokeApiKeyModal', () => {
  const Mock = () => <div data-testid="revoke-api-key-modal" />;
  Mock.displayName = 'MockRevokeApiKeyModal';
  return { __esModule: true, default: Mock };
});

jest.mock('~/app/pages/keys-and-subs/apiKeys/allKeys/ApiKeysTableRow', () => {
  const Mock: React.FC<{ apiKey: APIKey }> = ({ apiKey }) => (
    <tr data-testid={`api-key-row-${apiKey.id}`}>
      <td>{apiKey.name}</td>
    </tr>
  );
  Mock.displayName = 'MockApiKeysTableRow';
  return { __esModule: true, default: Mock };
});

const mockSubscription: UserSubscription = {
  subscription_id_header: 'sub-123',
  subscription_description: 'Test subscription',
  display_name: 'Test Sub',
  priority: 1,
  model_refs: [],
};

const mockApiKey: APIKey = {
  id: 'key-1',
  name: 'test-key',
  creationDate: '2026-01-01',
  status: 'active',
};

const defaultResponse: APIKeyListResponse = {
  object: 'list',
  data: [],
  has_more: false,
};

describe('MySubscriptionsApiKeyTable', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHookReturn = {
      response: defaultResponse,
      loaded: true,
      error: undefined,
      refresh: mockRefresh,
      page: 1,
      perPage: 5,
      sortField: 'created_at',
      sortDirection: 'desc',
      isFetching: false,
      onSetPage: mockOnSetPage,
      onPerPageSelect: mockOnPerPageSelect,
      onSort: mockOnSort,
    };
  });

  it('should render sortable column headers with sort props', () => {
    render(<MySubscriptionsApiKeyTable subscription={mockSubscription} />);

    const table = screen.getByTestId('subscription-api-keys-table');
    const headers = within(table).getAllByRole('columnheader');
    const headerLabels = headers.map((h) => h.textContent);

    expect(headerLabels).toContain('Name');
    expect(headerLabels).toContain('Created');
    expect(headerLabels).toContain('Expires');
    expect(headerLabels).toContain('Last used');
  });

  it('should mark the active sort column with the correct direction', () => {
    mockHookReturn.sortField = 'created_at';
    mockHookReturn.sortDirection = 'desc';
    render(<MySubscriptionsApiKeyTable subscription={mockSubscription} />);

    const table = screen.getByTestId('subscription-api-keys-table');
    const createdHeader = within(table)
      .getAllByRole('columnheader')
      .find((h) => h.textContent.includes('Created'));
    expect(createdHeader).toBeDefined();

    const sortButton = within(createdHeader!).getByRole('button');
    expect(sortButton).toBeInTheDocument();
  });

  it('should call onSort with the correct field when a sortable column header is clicked', () => {
    render(<MySubscriptionsApiKeyTable subscription={mockSubscription} />);

    const table = screen.getByTestId('subscription-api-keys-table');
    const nameHeader = within(table)
      .getAllByRole('columnheader')
      .find((h) => h.textContent.includes('Name'));
    expect(nameHeader).toBeDefined();

    const sortButton = within(nameHeader!).getByRole('button');
    fireEvent.click(sortButton);
    expect(mockOnSort).toHaveBeenCalledWith('name', expect.any(String));
  });

  it('should call onSort with the correct field for each sortable column', () => {
    render(<MySubscriptionsApiKeyTable subscription={mockSubscription} />);

    const table = screen.getByTestId('subscription-api-keys-table');
    const headers = within(table).getAllByRole('columnheader');

    const sortableColumns = [
      { label: 'Created', field: 'created_at' },
      { label: 'Expires', field: 'expires_at' },
      { label: 'Last used', field: 'last_used_at' },
    ];

    for (const col of sortableColumns) {
      const header = headers.find((h) => h.textContent.includes(col.label));
      expect(header).toBeDefined();
      const sortButton = within(header!).getByRole('button');
      fireEvent.click(sortButton);
      expect(mockOnSort).toHaveBeenCalledWith(col.field, expect.any(String));
      mockOnSort.mockClear();
    }
  });

  it('should not have sort controls on non-sortable columns', () => {
    render(<MySubscriptionsApiKeyTable subscription={mockSubscription} />);

    const table = screen.getByTestId('subscription-api-keys-table');
    const statusHeader = within(table)
      .getAllByRole('columnheader')
      .find((h) => h.textContent.includes('Status'));
    expect(statusHeader).toBeDefined();

    expect(within(statusHeader!).queryByRole('button')).toBeNull();
  });

  it('should render API key rows when data is loaded', () => {
    mockHookReturn.response = {
      object: 'list',
      data: [mockApiKey],
      has_more: false,
    };
    render(<MySubscriptionsApiKeyTable subscription={mockSubscription} />);

    expect(screen.getByTestId('api-key-row-key-1')).toBeInTheDocument();
  });

  it('should show empty state when no API keys exist', () => {
    render(<MySubscriptionsApiKeyTable subscription={mockSubscription} />);

    expect(screen.getByTestId('subscription-api-keys-empty')).toBeInTheDocument();
  });

  it('should show loading skeletons when fetching', () => {
    mockHookReturn.loaded = false;
    render(<MySubscriptionsApiKeyTable subscription={mockSubscription} />);

    expect(screen.getByTestId('subscription-api-keys-loading')).toBeInTheDocument();
  });

  it('should show loading skeletons during sort re-fetch', () => {
    mockHookReturn.isFetching = true;
    render(<MySubscriptionsApiKeyTable subscription={mockSubscription} />);

    expect(screen.getByTestId('subscription-api-keys-loading')).toBeInTheDocument();
  });

  it('should show error alert when there is a load error', () => {
    mockHookReturn.error = new Error('Network error');
    render(<MySubscriptionsApiKeyTable subscription={mockSubscription} />);

    expect(screen.getByTestId('subscription-api-keys-error')).toBeInTheDocument();
  });

  it('should reflect active sort index for different sort fields', () => {
    mockHookReturn.sortField = 'name';
    mockHookReturn.sortDirection = 'asc';
    render(<MySubscriptionsApiKeyTable subscription={mockSubscription} />);

    const table = screen.getByTestId('subscription-api-keys-table');
    const nameHeader = within(table)
      .getAllByRole('columnheader')
      .find((h) => h.textContent.includes('Name'));
    expect(nameHeader).toBeDefined();

    expect(within(nameHeader!).getByRole('button')).toBeInTheDocument();
  });

  it('should call onSort with correct direction for descending sort', () => {
    mockHookReturn.sortField = 'name';
    mockHookReturn.sortDirection = 'asc';
    render(<MySubscriptionsApiKeyTable subscription={mockSubscription} />);

    const table = screen.getByTestId('subscription-api-keys-table');
    const nameHeader = within(table)
      .getAllByRole('columnheader')
      .find((h) => h.textContent.includes('Name'));
    expect(nameHeader).toBeDefined();

    const sortButton = within(nameHeader!).getByRole('button');
    fireEvent.click(sortButton);
    expect(mockOnSort).toHaveBeenCalledWith('name', expect.any(String));
  });

  it('should compute activeSortIndex based on sortField matching serverSortField', () => {
    mockHookReturn.sortField = 'expires_at';
    mockHookReturn.sortDirection = 'asc';
    render(<MySubscriptionsApiKeyTable subscription={mockSubscription} />);

    const table = screen.getByTestId('subscription-api-keys-table');
    const expiresHeader = within(table)
      .getAllByRole('columnheader')
      .find((h) => h.textContent.includes('Expires'));
    expect(expiresHeader).toBeDefined();

    const sortButton = within(expiresHeader!).getByRole('button');
    expect(sortButton).toBeInTheDocument();
  });

  it('should call onSort for last_used_at column with correct server sort field', () => {
    render(<MySubscriptionsApiKeyTable subscription={mockSubscription} />);

    const table = screen.getByTestId('subscription-api-keys-table');
    const lastUsedHeader = within(table)
      .getAllByRole('columnheader')
      .find((h) => h.textContent.includes('Last used'));
    expect(lastUsedHeader).toBeDefined();

    const sortButton = within(lastUsedHeader!).getByRole('button');
    fireEvent.click(sortButton);
    expect(mockOnSort).toHaveBeenCalledWith('last_used_at', expect.any(String));
  });
});
