import * as React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ModelOverviewItem } from '~/app/types/subscriptions';
import OverviewTable from '~/app/pages/maas-governance/overview/OverviewTable';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

jest.mock('~/app/pages/maas-governance/overview/OverviewTableRow', () => {
  const MockOverviewTableRow: React.FC<{ row: { id: string } }> = ({ row }) => (
    <tbody data-testid={`mock-row-${row.id}`}>
      <tr>
        <td>{row.id}</td>
      </tr>
    </tbody>
  );
  MockOverviewTableRow.displayName = 'MockOverviewTableRow';
  return { __esModule: true, default: MockOverviewTableRow };
});

const mockOverviewItem = (id: string): ModelOverviewItem => ({
  id,
  namespace: 'test-namespace',
  modelDetails: {
    displayName: `Model ${id}`,
    phase: 'Ready',
  },
  subscriptions: [{ name: 'sub-1' }],
  authPolicies: [{ name: 'policy-1' }],
});

describe('OverviewTable', () => {
  const onClearFilters = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render pagination when data length equals page size', () => {
    const data = Array.from({ length: 10 }, (_, i) => mockOverviewItem(`model-${i}`));
    render(<OverviewTable data={data} toolbarContent={null} onClearFilters={onClearFilters} />);

    expect(screen.getByTestId('overview-table')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument();
  });

  it('should render pagination when data length is less than page size', () => {
    const data = [mockOverviewItem('model-1'), mockOverviewItem('model-2')];
    render(<OverviewTable data={data} toolbarContent={null} onClearFilters={onClearFilters} />);

    expect(screen.getByTestId('overview-table')).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument();
  });

  it('should not render pagination when data is empty', () => {
    render(<OverviewTable data={[]} toolbarContent={null} onClearFilters={onClearFilters} />);

    expect(screen.getByTestId('overview-table')).toBeInTheDocument();
    expect(screen.queryByRole('navigation', { name: /pagination/i })).not.toBeInTheDocument();
  });

  it('should render pagination when data length exceeds page size', () => {
    const data = Array.from({ length: 15 }, (_, i) => mockOverviewItem(`model-${i}`));
    render(<OverviewTable data={data} toolbarContent={null} onClearFilters={onClearFilters} />);

    expect(screen.getByRole('navigation', { name: /pagination/i })).toBeInTheDocument();
  });
});
