import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { mockConnectionType } from '~/__mocks__/mockConnectionType';
import { useConnectionTypes } from '~/app/hooks/useConnectionTypes';
import ConnectionTypesTab from '~/app/pages/ConnectionTypesTab';

jest.mock('~/app/hooks/useConnectionTypes');
jest.mock('@odh-dashboard/ui-core/components/TruncatedText', () => ({
  __esModule: true,
  default: ({ content }: { content?: string | null }) => <>{content}</>,
}));

const mockUseConnectionTypes = jest.mocked(useConnectionTypes);
const connectionTypes = [
  mockConnectionType(),
  mockConnectionType({
    metadata: { id: 's3' },
    resource: {
      name: 'S3',
      provider: 's3',
      description: 'Store binary objects in S3.',
    },
  }),
  mockConnectionType({
    metadata: { id: 'custom' },
    resource: {
      name: 'Custom source',
      provider: 'custom-provider',
      description: 'A community data source.',
    },
  }),
];

const renderTab = () =>
  render(
    <MemoryRouter initialEntries={['/connection-types?project=test-project']}>
      <ConnectionTypesTab namespace="test-project" />
    </MemoryRouter>,
  );

describe('ConnectionTypesTab', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseConnectionTypes.mockReturnValue([connectionTypes, true, undefined]);
  });

  it('should load and group connection types by provider', () => {
    renderTab();

    expect(mockUseConnectionTypes).toHaveBeenCalledWith('test-project');
    expect(screen.getByRole('heading', { name: 'Red Hat connections' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: 'Other connections' })).toBeTruthy();
    expect(screen.getByText('S3')).toBeTruthy();
    expect(screen.getByText('PostgreSQL')).toBeTruthy();
    expect(screen.getByText('Custom source')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Red Hat partner connections' })).toBeNull();
  });

  it('should show only the selected connection group', async () => {
    const user = userEvent.setup();
    renderTab();

    await user.click(screen.getByRole('button', { name: 'Other connections' }));

    expect(screen.queryByRole('heading', { name: 'Red Hat connections' })).toBeNull();
    expect(screen.getByRole('heading', { name: 'Other connections' })).toBeTruthy();
    expect(screen.queryByText('S3')).toBeNull();
    expect(screen.getByText('PostgreSQL')).toBeTruthy();
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
          metadata: { id: 'without-description' },
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
    expect(screen.queryByRole('heading', { name: 'Red Hat connections' })).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Other connections' })).toBeNull();
  });

  it('should render the getting-started state when no connection types exist', () => {
    mockUseConnectionTypes.mockReturnValue([[], true, undefined]);

    renderTab();

    expect(screen.getByText('Get started with data connection types')).toBeTruthy();
    expect(screen.queryByRole('textbox')).toBeNull();
  });
});
