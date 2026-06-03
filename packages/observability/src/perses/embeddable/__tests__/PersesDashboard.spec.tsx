import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { Dashboard } from '@perses-dev/dashboards';
import PersesDashboard from '../PersesDashboard';

jest.mock('@perses-dev/dashboards', () => ({
  Dashboard: jest.fn(() => <div data-testid="perses-dashboard" />),
}));

const DashboardMock = jest.mocked(Dashboard);

describe('PersesDashboard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the Perses Dashboard component', () => {
    render(<PersesDashboard />);
    expect(screen.getByTestId('perses-dashboard')).toBeDefined();
  });

  it('should pass empty dashboard props', () => {
    render(<PersesDashboard />);
    expect(DashboardMock).toHaveBeenCalledWith(
      expect.objectContaining({
        emptyDashboardProps: {
          title: 'Empty Dashboard',
          description: 'To get started add something to your dashboard',
        },
      }),
      expect.anything(),
    );
  });
});
