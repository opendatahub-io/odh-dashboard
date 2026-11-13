import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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
  authPolicies: [{ name: `${name}-policy` }],
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
        toolbarContent={null}
        onClearFilters={onClearFilters}
      />,
    );

    expect(screen.getByTestId('groups-table')).toBeInTheDocument();
    expect(screen.getByTestId('overview-group-row-alpha-users')).toBeInTheDocument();
    expect(screen.getByTestId('overview-group-row-beta-users')).toBeInTheDocument();
  });

  it('should show the subscription count per group', () => {
    render(
      <GroupsTable
        data={[mockGroup('alpha-users')]}
        toolbarContent={null}
        onClearFilters={onClearFilters}
      />,
    );

    expect(screen.getByTestId('overview-group-row-alpha-users')).toHaveTextContent('1');
  });

  it('should expand a group row on toggle', () => {
    render(
      <GroupsTable
        data={[mockGroup('alpha-users')]}
        toolbarContent={null}
        onClearFilters={onClearFilters}
      />,
    );

    const expandButton = screen.getByTestId('expand-group').querySelector('button') as HTMLElement;
    expect(expandButton).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(expandButton);
    expect(expandButton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('alpha-users-sub')).toBeInTheDocument();
  });

  it('should render the empty filter state when data is empty', () => {
    render(<GroupsTable data={[]} toolbarContent={null} onClearFilters={onClearFilters} />);

    expect(screen.getByTestId('groups-table')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: /pagination/i })).not.toBeInTheDocument();
  });
});
