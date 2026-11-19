import * as React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GroupOverviewItem } from '~/app/types/subscriptions';
import GroupsTable from '~/app/pages/maas-governance/overview/GroupsTable';

jest.mock('~/app/pages/maas-governance/overview/ExpandedModelContent', () => {
  const MockExpandedContent: React.FC<{ subscriptions: { name: string }[] }> = ({
    subscriptions,
  }) => (
    <div data-testid="mock-expanded-content">
      {subscriptions.map((s) => (
        <span key={s.name}>{s.name}</span>
      ))}
    </div>
  );
  MockExpandedContent.displayName = 'MockExpandedContent';
  return { __esModule: true, default: MockExpandedContent };
});

const mockGroup = (name: string): GroupOverviewItem => ({
  name,
  subscriptions: [
    {
      name: `${name}-sub`,
      modelRefs: [{ name: 'granite-3-8b-instruct', namespace: 'maas-models', tokenRateLimits: [] }],
    },
  ],
  authPolicies: [{ name: `${name}-policy`, modelRefs: [] }],
});

describe('GroupsTable', () => {
  const onClearFilters = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render one row per group', () => {
    render(
      <GroupsTable
        data={[mockGroup('alpha-users'), mockGroup('beta-users')]}
        onClearFilters={onClearFilters}
      />,
    );

    expect(screen.getByTestId('groups-table')).toBeInTheDocument();
    expect(screen.getByTestId('overview-group-row-alpha-users')).toBeInTheDocument();
    expect(screen.getByTestId('overview-group-row-beta-users')).toBeInTheDocument();
  });

  it('should show the subscription count per group', () => {
    render(<GroupsTable data={[mockGroup('alpha-users')]} onClearFilters={onClearFilters} />);

    expect(screen.getByTestId('overview-group-row-alpha-users')).toHaveTextContent('1');
  });

  it('should expand a group row on toggle', () => {
    render(<GroupsTable data={[mockGroup('alpha-users')]} onClearFilters={onClearFilters} />);

    const expandButton = screen.getByTestId('expand-group').querySelector('button') as HTMLElement;
    expect(expandButton).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(expandButton);
    expect(expandButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('alpha-users-sub')).toBeInTheDocument();
  });

  it('should align header columns with the rendered row cells', () => {
    render(<GroupsTable data={[mockGroup('alpha-users')]} onClearFilters={onClearFilters} />);

    const table = screen.getByTestId('groups-table');
    // The header row leads with a cell for the expansion column (empty labels
    // render as td for a11y), then one columnheader per labeled column
    const headerCells = within(within(table).getAllByRole('row')[0]).getAllByRole('columnheader');
    expect(headerCells.map((h) => h.textContent)).toEqual([
      'Group name',
      'Subscriptions',
      'Authorization policies',
    ]);

    // The main row has one cell per header, starting with the expansion toggle
    const rows = within(screen.getByTestId('overview-group-row-alpha-users')).getAllByRole('row');
    const cells = within(rows[0]).getAllByRole('cell');
    expect(cells).toHaveLength(4);
    expect(cells[1]).toHaveTextContent('alpha-users');
  });

  it('should render the empty filter state when data is empty', () => {
    render(<GroupsTable data={[]} onClearFilters={onClearFilters} />);

    expect(screen.getByTestId('groups-table')).toBeInTheDocument();
    expect(screen.getByTestId('dashboard-empty-table-state')).toBeInTheDocument();
  });
});
