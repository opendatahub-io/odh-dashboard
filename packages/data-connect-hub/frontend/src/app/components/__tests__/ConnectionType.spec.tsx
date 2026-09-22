import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { mockConnectionType } from '~/__mocks__/mockConnectionType';
import {
  ConnectionTypeCard,
  ConnectionTypeCardIdentifier,
  ConnectionTypeIcon,
  ConnectionTypeValues,
  KnownConnectionTypes,
} from '~/app/components/ConnectionType';

jest.mock('@odh-dashboard/ui-core/components/TruncatedText', () => ({
  __esModule: true,
  default: ({ content }: { content?: string | null }) => <>{content}</>,
}));

const LocationDisplay = () => {
  const location = useLocation();
  return <span data-testid="location">{location.pathname + location.search}</span>;
};

describe('ConnectionType', () => {
  it('should map supported providers to the expected groups', () => {
    expect(KnownConnectionTypes.s3.group).toBe('red_hat');
    expect(KnownConnectionTypes['uri-v1'].group).toBe('red_hat');
    expect(KnownConnectionTypes.postgres.group).toBe('other');
    expect(KnownConnectionTypes.huggingface.id).toBe('huggingface');
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

  it('should render card content and navigate to an encoded details route', async () => {
    const user = userEvent.setup();
    const connectionType = mockConnectionType({
      metadata: { id: 'provider/type one' },
      resource: { name: 'Provider type', description: 'Provider description' },
    });
    render(
      <MemoryRouter initialEntries={['/connection-types?project=test-project']}>
        <Routes>
          <Route
            path="*"
            element={
              <>
                <ConnectionTypeCard connectionType={connectionType} />
                <LocationDisplay />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    );

    expect(screen.getByTestId(ConnectionTypeCardIdentifier('provider/type one'))).toBeTruthy();
    expect(screen.getByText('Provider type')).toBeTruthy();
    expect(screen.getByText('Provider description')).toBeTruthy();

    await user.click(screen.getByRole('link'));

    expect(screen.getByTestId('location').textContent).toBe(
      '/connection-types/provider%2Ftype%20one?project=test-project',
    );
  });

  it('should render the provider and timestamps in the details values', () => {
    render(<ConnectionTypeValues connectionType={mockConnectionType()} />);

    expect(screen.getByText('Provider')).toBeTruthy();
    expect(screen.getByText('postgresql')).toBeTruthy();
    expect(screen.getByText('Created')).toBeTruthy();
    expect(screen.getByText('Last modified')).toBeTruthy();
    expect(screen.queryByText('Category')).toBeNull();
  });
});
