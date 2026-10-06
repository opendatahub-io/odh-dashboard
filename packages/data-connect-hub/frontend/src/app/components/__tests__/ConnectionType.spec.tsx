import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockConnectionType } from '~/__mocks__/mockConnectionType';
import {
  ConnectionTypeCard,
  ConnectionTypeCardIdentifier,
  ConnectionTypeIcon,
  ConnectionTypeValues,
} from '~/app/components/ConnectionType';

jest.mock('@odh-dashboard/ui-core/components/TruncatedText', () => ({
  __esModule: true,
  default: ({ content }: { content?: string | null }) => <>{content}</>,
}));

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

    await user.click(screen.getByRole('button', { name: 'Provider type' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('should render the provider and relative timestamps in the details values', () => {
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

    expect(screen.getByText('Provider')).toBeTruthy();
    expect(screen.getByText('postgresql')).toBeTruthy();
    expect(screen.getByText('Created')).toBeTruthy();
    expect(screen.getByText('2 days ago')).toBeTruthy();
    expect(screen.getByText('Last modified')).toBeTruthy();
    expect(screen.getByText('1 day ago')).toBeTruthy();
    expect(screen.queryByText('Category')).toBeNull();
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
