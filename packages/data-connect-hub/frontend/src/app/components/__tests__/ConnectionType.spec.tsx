import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockConnectionType } from '~/__mocks__/mockConnectionType';
import {
  ConnectionTypeCard,
  ConnectionTypeCardIdentifier,
  ConnectionTypeInstance,
  ConnectionTypeIcon,
  ConnectionTypeLabel,
  ConnectionTypeValues,
} from '~/app/components/ConnectionType';

jest.mock('@odh-dashboard/ui-core/components/TruncatedText', () => ({
  __esModule: true,
  default: ({ content }: { content?: string | null }) => <>{content}</>,
}));

describe('ConnectionTypeInstance', () => {
  it('should expose the source connection type and its id', () => {
    const original = mockConnectionType().toJSON();
    const connectionType = new ConnectionTypeInstance(original);

    expect(connectionType.id).toBe('postgresql');
    expect(connectionType.metadata).toBe(original.metadata);
    expect(connectionType.resource).toBe(original.resource);
    expect(connectionType.status).toBe(original.status);
    expect(connectionType.toJSON()).toBe(original);
  });

  it('should identify a flight-ready connection type as fully integrated', () => {
    const connectionType = mockConnectionType({ status: { flight_ready: true } });

    expect(connectionType.isFullIntegration()).toBe(true);
    expect(connectionType.isCredentialsOnly()).toBe(false);
  });

  it('should identify a non-flight-ready connection type as credentials only', () => {
    const connectionType = mockConnectionType({ status: { flight_ready: false } });

    expect(connectionType.isFullIntegration()).toBe(false);
    expect(connectionType.isCredentialsOnly()).toBe(true);
  });

  it('should treat a missing status as credentials only', () => {
    const original = mockConnectionType().toJSON();
    const connectionType = new ConnectionTypeInstance({ ...original, status: undefined });

    expect(connectionType.isFullIntegration()).toBe(false);
    expect(connectionType.isCredentialsOnly()).toBe(true);
  });

  it.each([
    ['name', '  POSTGRESQL  '],
    ['description', 'POSTGRESQL DATABASE'],
    ['an empty term', '   '],
  ])('should match a case-insensitive, trimmed search by %s', (_description, searchTerm) => {
    const connectionType = mockConnectionType();

    expect(connectionType.matchesSearch(searchTerm)).toBe(true);
  });

  it('should reject a search that matches neither name nor description', () => {
    expect(mockConnectionType().matchesSearch('object storage')).toBe(false);
  });

  it.each([undefined, null])(
    'should not stringify a missing description when searching (%p)',
    (description) => {
      const connectionType = mockConnectionType({ resource: { description } });

      expect(connectionType.matchesSearch(String(description))).toBe(false);
    },
  );

  it('should currently accept string and array label filters', () => {
    const connectionType = mockConnectionType();

    expect(connectionType.matchesLabels('production')).toBe(true);
    expect(connectionType.matchesLabels(['production', 'finance'])).toBe(true);
  });
});

describe('ConnectionType', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render known and fallback provider icons', () => {
    const { rerender } = render(
      <ConnectionTypeIcon connectionType={mockConnectionType({ resource: { provider: 's3' } })} />,
    );
    expect(screen.getByTestId('connection-type-icon')).toBeTruthy();

    rerender(
      <ConnectionTypeIcon
        connectionType={mockConnectionType({ resource: { provider: 'unknown-provider' } })}
      />,
    );
    expect(screen.getByTestId('connection-type-icon-fallback')).toBeTruthy();
  });

  it('should render card content and call the click handler', async () => {
    const user = userEvent.setup();
    const onClick = jest.fn();
    const connectionType = mockConnectionType({
      metadata: { id: 'provider/type one' },
      resource: { name: 'Provider type', description: 'Provider description' },
    });
    render(<ConnectionTypeCard connectionType={connectionType} onClick={onClick} />);

    expect(screen.getByTestId(ConnectionTypeCardIdentifier('provider/type one'))).toBeTruthy();
    expect(screen.getByText('Provider type')).toBeTruthy();
    expect(screen.getByText('Provider description')).toBeTruthy();
    expect(screen.getByText('Full integration')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Provider type' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should render the credentials-only capability label', () => {
    render(
      <ConnectionTypeLabel
        connectionType={mockConnectionType({ status: { flight_ready: false } })}
      />,
    );

    expect(screen.getByText('Credentials only')).toBeTruthy();
  });

  it('should render the description, provider, capability, and timestamps in the details values', () => {
    const oneDayInMs = 24 * 60 * 60 * 1000;
    const now = new Date('2026-09-10T16:00:00Z').getTime();
    const connectionType = mockConnectionType({
      metadata: {
        created_at: new Date(now - 2 * oneDayInMs).toISOString(),
        updated_at: new Date(now - oneDayInMs).toISOString(),
      },
    });
    jest.spyOn(Date, 'now').mockReturnValue(now);

    render(<ConnectionTypeValues connectionType={connectionType} />);

    expect(screen.getByRole('heading', { name: 'Details' })).toBeTruthy();
    expect(screen.getByText('Description')).toBeTruthy();
    expect(screen.getByText('Connect to a PostgreSQL database.')).toBeTruthy();
    expect(screen.getByText('Provider')).toBeTruthy();
    expect(screen.getByText('postgresql')).toBeTruthy();
    expect(screen.getByText('Capability')).toBeTruthy();
    expect(screen.getByText('Full integration')).toBeTruthy();
    expect(screen.getByText('Created')).toBeTruthy();
    expect(screen.getByText('2 days ago')).toBeTruthy();
    expect(screen.getByText('Last modified')).toBeTruthy();
    expect(screen.getByText('1 day ago')).toBeTruthy();
    expect(screen.queryByText('Category')).toBeNull();
    expect(screen.queryByText('License')).toBeNull();
    expect(screen.queryByText('Source')).toBeNull();
  });

  it('should render a fallback for invalid timestamps', () => {
    render(
      <ConnectionTypeValues
        connectionType={mockConnectionType({
          metadata: { created_at: 'invalid-created-at', updated_at: 'invalid-updated-at' },
        })}
      />,
    );

    expect(screen.getAllByText('-')).toHaveLength(2);
    expect(screen.queryByText('Invalid Date')).toBeNull();
  });
});
