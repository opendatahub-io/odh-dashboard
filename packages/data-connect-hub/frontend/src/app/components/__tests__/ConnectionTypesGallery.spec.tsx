import React from 'react';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { mockConnectionType } from '~/__mocks__/mockConnectionType';
import ConnectionTypesGallery from '~/app/components/ConnectionTypesGallery';

jest.mock('@odh-dashboard/ui-core/components/TruncatedText', () => ({
  __esModule: true,
  default: ({ content }: { content?: string | null }) => <>{content}</>,
}));

describe('ConnectionTypesGallery', () => {
  const getConnectionTypes = () => [
    mockConnectionType({
      metadata: { id: 'postgresql' },
      resource: { name: 'PostgreSQL', description: 'A relational database.' },
    }),
    mockConnectionType({
      metadata: { id: 's3' },
      resource: { name: 'S3', provider: 's3', description: 'Binary object storage.' },
    }),
    mockConnectionType({
      metadata: { id: 'oci-v1' },
      resource: { name: 'OCI', provider: 'oci-v1', description: 'Container credentials.' },
      status: { flight_ready: false },
    }),
  ];

  it('should call the custom action with the selected connection type', async () => {
    const user = userEvent.setup();
    const onConnectionTypeClick = jest.fn();
    const connectionType = mockConnectionType({
      resource: { name: 'PostgreSQL connection' },
    });

    render(
      <ConnectionTypesGallery
        connectionTypes={[connectionType]}
        onConnectionTypeClick={onConnectionTypeClick}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'PostgreSQL connection' }));

    expect(onConnectionTypeClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: connectionType.metadata.id }),
    );
  });

  it('should group connection types by capability', () => {
    render(
      <ConnectionTypesGallery
        connectionTypes={getConnectionTypes()}
        onConnectionTypeClick={jest.fn()}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Full integration' })).toBeTruthy();
    expect(
      screen.getByText('Connection types with credential management and data ingestion support.'),
    ).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Credentials only' })).toBeTruthy();
    expect(
      screen.getByText(
        'Connection types that store credentials for authentication without built-in ingestion.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('PostgreSQL')).toBeTruthy();
    expect(screen.getByText('S3')).toBeTruthy();
    expect(screen.getByText('OCI')).toBeTruthy();
  });

  it('should render selectable cards and identify the selected connection type', async () => {
    const user = userEvent.setup();
    const onConnectionTypeClick = jest.fn();
    render(
      <ConnectionTypesGallery
        connectionTypes={getConnectionTypes()}
        onConnectionTypeClick={onConnectionTypeClick}
        isSelectable
        selectedConnectionTypeId="s3"
      />,
    );

    const selectedCard = screen.getByTestId('s3--ConnectionTypeCard');
    expect(selectedCard.className).toContain('pf-m-selected');

    await user.click(
      within(screen.getByTestId('oci-v1--ConnectionTypeCard')).getByRole('radio', {
        hidden: true,
      }),
    );

    expect(onConnectionTypeClick).toHaveBeenCalledWith(expect.objectContaining({ id: 'oci-v1' }));
  });

  it('should filter connection types by capability', async () => {
    const user = userEvent.setup();
    render(
      <ConnectionTypesGallery
        connectionTypes={getConnectionTypes()}
        onConnectionTypeClick={jest.fn()}
      />,
    );

    await user.click(screen.getByTestId('connection-types-gallery-dropdown'));
    await user.click(
      within(screen.getByTestId('connection-types-gallery-dropdown-capability')).getByRole(
        'option',
        { name: 'Capability' },
      ),
    );
    await user.click(screen.getByTestId('connection-types-gallery-capability-dropdown'));
    await user.click(
      within(screen.getByTestId('connection-types-gallery-capability-credentials')).getByRole(
        'option',
        { name: 'Credentials only' },
      ),
    );

    expect(screen.getByText('OCI')).toBeTruthy();
    expect(screen.queryByText('PostgreSQL')).toBeNull();
    expect(screen.queryByText('S3')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Credentials only' })).toBeNull();
  });

  // TODO: Labels are waiting on API changes; re-enable this test when label filtering is enabled.
  it.skip('should support selecting and clearing multiple label filters', async () => {
    const user = userEvent.setup();

    render(<ConnectionTypesGallery connectionTypes={[]} onConnectionTypeClick={jest.fn()} />);

    await user.click(screen.getByTestId('connection-types-gallery-dropdown'));
    const labelsFilterOption = screen.getByTestId('connection-types-gallery-dropdown-labels');
    await user.click(within(labelsFilterOption).getByRole('option', { name: 'Labels' }));
    await user.click(screen.getByTestId('connection-types-gallery-labels-dropdown'));
    const firstLabelOption = screen.getByTestId('connection-types-gallery-labels-label-01');
    const secondLabelOption = screen.getByTestId('connection-types-gallery-labels-label-02');
    await user.click(within(firstLabelOption).getByRole('checkbox'));
    await user.click(within(secondLabelOption).getByRole('checkbox'));

    const labelsToggle = screen.getByTestId('connection-types-gallery-labels-dropdown');
    expect(labelsToggle.textContent).toContain('2');

    await user.click(labelsToggle);

    const toolbar = screen.getByTestId('connection-types-gallery-toolbar');
    expect(within(toolbar).getByText('Label 01')).toBeTruthy();
    expect(within(toolbar).getByText('Label 02')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Clear all filters' }));

    expect(labelsToggle.textContent).not.toContain('2');
    expect(within(toolbar).queryByText('Label 01')).toBeNull();
    expect(within(toolbar).queryByText('Label 02')).toBeNull();
  });

  it('should search names and descriptions and clear the search', async () => {
    const user = userEvent.setup();
    render(
      <ConnectionTypesGallery
        connectionTypes={getConnectionTypes()}
        onConnectionTypeClick={jest.fn()}
      />,
    );
    const search = screen.getByRole('textbox', {
      name: 'Search data connection types by name',
    });

    await user.type(search, '  BINARY OBJECT  ');

    expect(screen.getByText('S3')).toBeTruthy();
    expect(screen.queryByText('PostgreSQL')).toBeNull();
    expect(screen.queryByText('OCI')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Full integration' })).toBeNull();

    await user.clear(search);

    expect(screen.getByText('PostgreSQL')).toBeTruthy();
    expect(screen.getByText('OCI')).toBeTruthy();
  });

  it('should render the no-match state for a search without results', async () => {
    const user = userEvent.setup();
    render(
      <ConnectionTypesGallery
        connectionTypes={getConnectionTypes()}
        onConnectionTypeClick={jest.fn()}
      />,
    );

    await user.type(
      screen.getByRole('textbox', { name: 'Search data connection types by name' }),
      'does-not-exist',
    );

    expect(screen.getByText('No matching data connection types')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Full integration' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Credentials only' })).toBeNull();
  });
});
