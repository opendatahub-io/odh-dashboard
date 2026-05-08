import * as React from 'react';
import { render, screen } from '@testing-library/react';
import PhaseLabel from '~/app/shared/PhaseLabel';

describe('PhaseLabel', () => {
  it('should render Active phase with correct text', () => {
    render(<PhaseLabel phase="Active" />);
    const label = screen.getByTestId('phase-label');
    expect(label).not.toBeNull();
    expect(label.textContent).toContain('Active');
  });

  it('should render Ready phase with correct text', () => {
    render(<PhaseLabel phase="Ready" />);
    const label = screen.getByTestId('phase-label');
    expect(label).not.toBeNull();
    expect(label.textContent).toContain('Ready');
  });

  it('should render Failed phase with correct text', () => {
    render(<PhaseLabel phase="Failed" />);
    const label = screen.getByTestId('phase-label');
    expect(label).not.toBeNull();
    expect(label.textContent).toContain('Failed');
  });

  it('should render Unhealthy phase with correct text', () => {
    render(<PhaseLabel phase="Unhealthy" />);
    const label = screen.getByTestId('phase-label');
    expect(label).not.toBeNull();
    expect(label.textContent).toContain('Unhealthy');
  });

  it('should render Pending phase with correct text', () => {
    render(<PhaseLabel phase="Pending" />);
    const label = screen.getByTestId('phase-label');
    expect(label).not.toBeNull();
    expect(label.textContent).toContain('Pending');
  });

  it('should render Unknown label when phase is undefined', () => {
    render(<PhaseLabel phase={undefined} />);
    const label = screen.getByTestId('phase-label');
    expect(label).not.toBeNull();
    expect(label.textContent).toContain('Unknown');
  });

  it('should render unrecognized phase values as-is', () => {
    render(<PhaseLabel phase="SomethingElse" />);
    const label = screen.getByTestId('phase-label');
    expect(label).not.toBeNull();
    expect(label.textContent).toContain('SomethingElse');
  });

  it('should render outline variant when no statusMessage is provided', () => {
    render(<PhaseLabel phase="Active" />);
    const label = screen.getByTestId('phase-label');
    expect(label.className).toContain('pf-m-outline');
    expect(screen.queryByTestId('phase-popover')).toBeNull();
  });

  it('should render filled variant with popover when statusMessage is provided', () => {
    render(<PhaseLabel phase="Failed" statusMessage="Token limit exceeded." />);
    const label = screen.getByTestId('phase-label');
    expect(label.className).not.toContain('pf-m-outline');
    expect(label.textContent).toContain('Failed');
  });
});
