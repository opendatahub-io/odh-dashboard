import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { mockConnectionType } from '~/__mocks__/mockConnectionType';
import * as trackingUtilities from '~/app/utilities/tracking';
import { useConnectionTypes } from '~/app/hooks/useConnectionTypes';
import ConnectionTypesTab from '~/app/pages/ConnectionTypesTab';

jest.mock('~/app/hooks/useConnectionTypes');
jest.mock('~/app/utilities/tracking', () => ({
  DATA_CONNECT_HUB_EVENT_NAMES: {
    typeSelected: 'Connections Type Selected',
  },
  isGlobalConnectionType: (connectionType: { metadata: { tenant_id?: string } }) =>
    !connectionType.metadata.tenant_id,
  fireDataConnectHubTrackEvent: jest.fn(),
}));
jest.mock('@odh-dashboard/ui-core/components/TruncatedText', () => ({
  __esModule: true,
  default: ({ content }: { content?: string | null }) => <>{content}</>,
}));

const mockUseConnectionTypes = jest.mocked(useConnectionTypes);
const mockTrackEvent = jest.fn();
const connectionTypes = [
  mockConnectionType(),
  mockConnectionType({
    metadata: { id: '550e8400-e29b-41d4-a716-446655440004' },
    resource: {
      name: 'S3',
      provider: 's3',
      description: 'Store binary objects in S3.',
    },
  }),
  mockConnectionType({
    metadata: { id: '550e8400-e29b-41d4-a716-446655440008' },
    resource: {
      name: 'Custom source',
      provider: 'custom-provider',
      description: 'A community data source.',
    },
    status: { flight_ready: false },
  }),
];

const LocationDisplay = () => {
  const location = useLocation();
  return <span data-testid="location">{location.pathname + location.search}</span>;
};

const renderTab = () =>
  render(
    <MemoryRouter initialEntries={['/connection-types?project=test-project']}>
      <ConnectionTypesTab namespace="test-project" />
      <LocationDisplay />
    </MemoryRouter>,
  );

describe('ConnectionTypesTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(trackingUtilities.fireDataConnectHubTrackEvent).mockImplementation(mockTrackEvent);
    mockUseConnectionTypes.mockReturnValue([connectionTypes, true, undefined]);
  });

  it('should load and group connection types by capability', () => {
    renderTab();

    expect(mockUseConnectionTypes).toHaveBeenCalledWith('test-project');
    expect(screen.getByRole('heading', { name: 'Full integration' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Credentials only' })).toBeTruthy();
    expect(screen.getByText('S3')).toBeTruthy();
    expect(screen.getByText('PostgreSQL')).toBeTruthy();
    expect(screen.getByText('Custom source')).toBeTruthy();
  });

  it('should navigate to the selected connection type details', async () => {
    const user = userEvent.setup();
    mockUseConnectionTypes.mockReturnValue([
      [
        mockConnectionType({
          metadata: { id: '550e8400-e29b-41d4-a716-446655440007' },
          resource: { name: 'Provider type' },
        }),
      ],
      true,
      undefined,
    ]);
    renderTab();

    await user.click(screen.getByRole('button', { name: 'Provider type' }));

    expect(screen.getByTestId('location').textContent).toBe(
      '/connection-types/550e8400-e29b-41d4-a716-446655440007?project=test-project',
    );
    expect(mockTrackEvent).toHaveBeenCalledWith({
      eventName: 'Connections Type Selected',
      properties: {
        connectionTypeProvider: 'postgresql',
        isGlobalType: false,
        project: 'test-project',
      },
    });
  });

  it('should filter connection types by name or description', async () => {
    const user = userEvent.setup();
    renderTab();
    const search = screen.getByRole('textbox', {
      name: 'Search data connection types by name',
    });

    await user.type(search, '  BINARY OBJECTS  ');

    expect(screen.getByText('S3')).toBeTruthy();
    expect(screen.queryByText('PostgreSQL')).toBeNull();
    expect(screen.queryByText('Custom source')).toBeNull();

    await user.clear(search);
    expect(screen.getByText('PostgreSQL')).toBeTruthy();
  });

  it('should not match missing descriptions as text', async () => {
    const user = userEvent.setup();
    mockUseConnectionTypes.mockReturnValue([
      [
        mockConnectionType({ resource: { description: undefined } }),
        mockConnectionType({
          metadata: { id: '550e8400-e29b-41d4-a716-446655440009' },
          resource: { name: 'Without description', description: null },
        }),
      ],
      true,
      undefined,
    ]);
    renderTab();
    const search = screen.getByRole('textbox', {
      name: 'Search data connection types by name',
    });

    await user.type(search, 'undefined');
    expect(screen.getByText('No matching data connection types')).toBeTruthy();

    await user.clear(search);
    await user.type(search, 'null');
    expect(screen.getByText('No matching data connection types')).toBeTruthy();
  });

  it('should render the no-match state when search removes every connection type', async () => {
    const user = userEvent.setup();
    renderTab();

    await user.type(
      screen.getByRole('textbox', { name: 'Search data connection types by name' }),
      'does-not-exist',
    );

    expect(screen.getByText('No matching data connection types')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Full integration' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Credentials only' })).toBeNull();
  });

  it('should render a loading state before connection types load', () => {
    mockUseConnectionTypes.mockReturnValue([[], false, undefined]);

    renderTab();

    expect(screen.getByLabelText('Loading data connection types')).toBeTruthy();
    expect(screen.queryByText('Get started with data connection types')).toBeNull();
  });

  it('should render the fetch error instead of the getting-started state', () => {
    mockUseConnectionTypes.mockReturnValue([
      [],
      true,
      new Error('Connection types request failed'),
    ]);

    renderTab();

    expect(screen.getByText('Connection types request failed')).toBeTruthy();
    expect(screen.queryByText('Get started with data connection types')).toBeNull();
  });
});
