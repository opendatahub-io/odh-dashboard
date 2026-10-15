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
      resource: {
        name: 'PostgreSQL',
        description: 'A relational database.',
        tags: ['production', 'finance'],
      },
    }),
    mockConnectionType({
      metadata: { id: 's3' },
      resource: {
        name: 'S3',
        provider: 's3',
        description: 'Binary object storage.',
        tags: ['storage', 'production'],
      },
    }),
    mockConnectionType({
      metadata: { id: 'oci-v1' },
      resource: {
        name: 'OCI',
        provider: 'oci-v1',
        description: 'Container credentials.',
        tags: ['storage', 'containers'],
      },
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

  it('should render the no-match state when filters exclude all connection types', async () => {
    const user = userEvent.setup();
    render(
      <ConnectionTypesGallery
        connectionTypes={getConnectionTypes().slice(0, 2)}
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

    expect(screen.getByText('No matching data connection types')).toBeTruthy();
    expect(screen.queryByText('PostgreSQL')).toBeNull();
    expect(screen.queryByText('S3')).toBeNull();
  });

  it('should combine capability filtering and search with AND behavior', async () => {
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
    await user.type(
      screen.getByRole('textbox', { name: 'Search data connection types by name' }),
      'relational',
    );

    expect(screen.getByText('No matching data connection types')).toBeTruthy();
    expect(screen.queryByText('PostgreSQL')).toBeNull();
    expect(screen.queryByText('OCI')).toBeNull();
  });

  it('should offer sorted, unique labels from all connection type groups', async () => {
    const user = userEvent.setup();
    render(
      <ConnectionTypesGallery
        connectionTypes={[
          ...getConnectionTypes(),
          mockConnectionType({ metadata: { id: 'untagged' } }),
        ]}
        onConnectionTypeClick={jest.fn()}
      />,
    );

    await user.click(screen.getByTestId('connection-types-gallery-dropdown'));
    await user.click(
      within(screen.getByTestId('connection-types-gallery-dropdown-labels')).getByRole('option', {
        name: 'Labels',
      }),
    );
    await user.click(screen.getByTestId('connection-types-gallery-labels-dropdown'));

    expect(screen.getAllByRole('menuitem').map((option) => option.textContent)).toEqual([
      'containers',
      'finance',
      'production',
      'storage',
    ]);
  });

  it.each([undefined, []])('should hide the labels filter when tags are %p', async (tags) => {
    const user = userEvent.setup();
    render(
      <ConnectionTypesGallery
        connectionTypes={[mockConnectionType({ resource: { tags } })]}
        onConnectionTypeClick={jest.fn()}
      />,
    );

    await user.click(screen.getByTestId('connection-types-gallery-dropdown'));

    expect(screen.getByTestId('connection-types-gallery-dropdown-capability')).toBeTruthy();
    expect(screen.queryByTestId('connection-types-gallery-dropdown-labels')).toBeNull();
  });

  it('should filter by any selected label and restore groups when filters are cleared', async () => {
    const user = userEvent.setup();

    render(
      <ConnectionTypesGallery
        connectionTypes={[
          ...getConnectionTypes(),
          mockConnectionType({ metadata: { id: 'untagged' }, resource: { name: 'Untagged' } }),
        ]}
        onConnectionTypeClick={jest.fn()}
      />,
    );

    await user.click(screen.getByTestId('connection-types-gallery-dropdown'));
    const labelsFilterOption = screen.getByTestId('connection-types-gallery-dropdown-labels');
    await user.click(within(labelsFilterOption).getByRole('option', { name: 'Labels' }));
    await user.click(screen.getByTestId('connection-types-gallery-labels-dropdown'));
    const firstLabelOption = screen.getByTestId('connection-types-gallery-labels-finance');
    const secondLabelOption = screen.getByTestId('connection-types-gallery-labels-storage');
    await user.click(within(firstLabelOption).getByRole('checkbox'));

    expect(screen.getByText('PostgreSQL')).toBeTruthy();
    expect(screen.queryByText('S3')).toBeNull();
    expect(screen.queryByText('OCI')).toBeNull();
    expect(screen.queryByText('Untagged')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Full integration' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Credentials only' })).toBeNull();

    await user.click(within(secondLabelOption).getByRole('checkbox'));

    expect(screen.getByText('PostgreSQL')).toBeTruthy();
    expect(screen.getByText('S3')).toBeTruthy();
    expect(screen.getByText('OCI')).toBeTruthy();
    expect(screen.queryByText('Untagged')).toBeNull();

    const labelsToggle = screen.getByTestId('connection-types-gallery-labels-dropdown');
    expect(labelsToggle.textContent).toContain('2');

    await user.click(labelsToggle);

    const toolbar = screen.getByTestId('connection-types-gallery-toolbar');
    expect(within(toolbar).getByText('finance')).toBeTruthy();
    expect(within(toolbar).getByText('storage')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: 'Clear all filters' }));

    expect(labelsToggle.textContent).not.toContain('2');
    expect(within(toolbar).queryByText('finance')).toBeNull();
    expect(within(toolbar).queryByText('storage')).toBeNull();
    expect(screen.getByText('Untagged')).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Full integration' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Credentials only' })).toBeTruthy();
  });

  it('should combine labels, capability, and search with AND behavior', async () => {
    const user = userEvent.setup();
    render(
      <ConnectionTypesGallery
        connectionTypes={getConnectionTypes()}
        onConnectionTypeClick={jest.fn()}
      />,
    );

    await user.click(screen.getByTestId('connection-types-gallery-dropdown'));
    await user.click(
      within(screen.getByTestId('connection-types-gallery-dropdown-labels')).getByRole('option', {
        name: 'Labels',
      }),
    );
    await user.click(screen.getByTestId('connection-types-gallery-labels-dropdown'));
    await user.click(
      within(screen.getByTestId('connection-types-gallery-labels-storage')).getByRole('checkbox'),
    );
    await user.click(screen.getByTestId('connection-types-gallery-labels-dropdown'));

    expect(screen.getByText('S3')).toBeTruthy();
    expect(screen.getByText('OCI')).toBeTruthy();
    expect(screen.queryByText('PostgreSQL')).toBeNull();

    await user.click(screen.getByTestId('connection-types-gallery-dropdown'));
    await user.click(
      within(screen.getByTestId('connection-types-gallery-dropdown-capability')).getByRole(
        'option',
        { name: 'Capability' },
      ),
    );
    await user.click(screen.getByTestId('connection-types-gallery-capability-dropdown'));
    await user.click(
      within(screen.getByTestId('connection-types-gallery-capability-full-integration')).getByRole(
        'option',
        { name: 'Full integration' },
      ),
    );

    expect(screen.getByText('S3')).toBeTruthy();
    expect(screen.queryByText('OCI')).toBeNull();
    expect(screen.queryByText('PostgreSQL')).toBeNull();

    const search = screen.getByRole('textbox', {
      name: 'Search data connection types by name',
    });
    await user.type(search, 'binary');
    expect(screen.getByText('S3')).toBeTruthy();

    await user.clear(search);
    await user.type(search, 'relational');

    expect(screen.getByText('No matching data connection types')).toBeTruthy();
    expect(screen.queryByText('S3')).toBeNull();
    expect(screen.queryByText('PostgreSQL')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Clear all filters' }));

    expect(screen.getByText('PostgreSQL')).toBeTruthy();
    expect(screen.queryByText('S3')).toBeNull();
    expect(screen.getByDisplayValue('relational')).toBe(search);
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
