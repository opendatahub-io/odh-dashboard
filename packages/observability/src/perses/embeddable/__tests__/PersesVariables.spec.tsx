import * as React from 'react';
import { render, screen } from '@testing-library/react';
import { DashboardStickyToolbar } from '@perses-dev/dashboards';
import PersesVariables from '../PersesVariables';

jest.mock('@perses-dev/dashboards', () => ({
  DashboardStickyToolbar: jest.fn(() => <div data-testid="perses-variables" />),
}));

const DashboardStickyToolbarMock = jest.mocked(DashboardStickyToolbar);

describe('PersesVariables', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the variable toolbar', () => {
    render(<PersesVariables />);
    expect(screen.getByTestId('perses-variables')).toBeDefined();
  });

  it('should default initialVariableIsSticky to undefined', () => {
    render(<PersesVariables />);
    expect(DashboardStickyToolbarMock).toHaveBeenCalledWith({}, expect.anything());
  });

  it('should pass initialVariableIsSticky when provided', () => {
    render(<PersesVariables initialVariableIsSticky />);
    expect(DashboardStickyToolbarMock).toHaveBeenCalledWith(
      expect.objectContaining({ initialVariableIsSticky: true }),
      expect.anything(),
    );
  });
});
