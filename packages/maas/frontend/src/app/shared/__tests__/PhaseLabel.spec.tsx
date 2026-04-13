import * as React from 'react';
import { render, screen } from '@testing-library/react';
import PhaseLabel from '~/app/shared/PhaseLabel';

describe('PhaseLabel', () => {
  it('should render a success label for Active phase', () => {
    render(<PhaseLabel phase="Active" />);
    const label = screen.getByText('Active').closest('.pf-v6-c-label');
    expect(label).not.toBeNull();
    expect(label?.className).toContain('pf-m-success');
  });

  it('should render a success label for Ready phase', () => {
    render(<PhaseLabel phase="Ready" />);
    const label = screen.getByText('Ready').closest('.pf-v6-c-label');
    expect(label).not.toBeNull();
    expect(label?.className).toContain('pf-m-success');
  });

  it('should render a danger label for Failed phase', () => {
    render(<PhaseLabel phase="Failed" />);
    const label = screen.getByText('Failed').closest('.pf-v6-c-label');
    expect(label).not.toBeNull();
    expect(label?.className).toContain('pf-m-danger');
  });

  it('should render a danger label for Unhealthy phase', () => {
    render(<PhaseLabel phase="Unhealthy" />);
    const label = screen.getByText('Unhealthy').closest('.pf-v6-c-label');
    expect(label).not.toBeNull();
    expect(label?.className).toContain('pf-m-danger');
  });

  it('should render a blue label for Pending phase', () => {
    render(<PhaseLabel phase="Pending" />);
    const label = screen.getByText('Pending').closest('.pf-v6-c-label');
    expect(label).not.toBeNull();
    expect(label?.className).toContain('pf-m-blue');
  });

  it('should render an em-dash when phase is undefined', () => {
    const { container } = render(<PhaseLabel phase={undefined} />);
    expect(container.textContent).toBe('—');
    expect(screen.queryByTestId('phase-label')).toBeNull();
  });

  it('should render a compact filled label for an unknown phase value', () => {
    render(<PhaseLabel phase="SomethingElse" />);
    const label = screen.getByText('SomethingElse').closest('.pf-v6-c-label');
    expect(label).not.toBeNull();
    expect(label?.className).toContain('pf-m-compact');
  });
});
