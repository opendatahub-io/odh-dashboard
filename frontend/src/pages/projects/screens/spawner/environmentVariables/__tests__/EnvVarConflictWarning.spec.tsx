import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EnvVarConflictWarning } from '#~/pages/projects/screens/spawner/environmentVariables/EnvVarConflictWarning';

describe('EnvVarConflictWarning', () => {
  it('should render alert with conflict message', () => {
    const conflicts = [
      {
        source1: 'Inline secret',
        source2: 'secret1',
        keys: ['KEY1', 'KEY2'],
      },
    ];

    render(<EnvVarConflictWarning conflicts={conflicts} />);

    expect(screen.getByTestId('envvar-conflict-warning')).toBeInTheDocument();
    expect(screen.getByText('Environment variables conflict')).toBeInTheDocument();
    expect(
      screen.getByText(/Environment variables from multiple sources conflict/),
    ).toBeInTheDocument();
  });

  it('should show expandable section with conflict details', () => {
    const conflicts = [
      {
        source1: 'Inline secret',
        source2: 'secret1',
        keys: ['KEY1'],
      },
    ];

    render(<EnvVarConflictWarning conflicts={conflicts} />);

    const toggleButton = screen.getByRole('button', { name: /show conflicts/i });
    fireEvent.click(toggleButton);

    expect(screen.getByTestId('envvar-conflict-0')).toBeInTheDocument();
    expect(screen.getByText('Inline secret')).toBeInTheDocument();
    expect(screen.getByText('secret1')).toBeInTheDocument();
    expect(screen.getByText('KEY1')).toBeInTheDocument();
  });

  it('should render multiple conflicts', () => {
    const conflicts = [
      {
        source1: 'Inline secret',
        source2: 'secret1',
        keys: ['KEY1'],
      },
      {
        source1: 'secret1',
        source2: 'secret2',
        keys: ['KEY2'],
      },
    ];

    render(<EnvVarConflictWarning conflicts={conflicts} />);

    const toggleButton = screen.getByRole('button', { name: /show conflicts/i });
    fireEvent.click(toggleButton);

    expect(screen.getByTestId('envvar-conflict-0')).toBeInTheDocument();
    expect(screen.getByTestId('envvar-conflict-1')).toBeInTheDocument();
  });

  it('should render multiple conflicting keys in a single conflict', () => {
    const conflicts = [
      {
        source1: 'Inline secret',
        source2: 'secret1',
        keys: ['KEY1', 'KEY2', 'KEY3'],
      },
    ];

    render(<EnvVarConflictWarning conflicts={conflicts} />);

    const toggleButton = screen.getByRole('button', { name: /show conflicts/i });
    fireEvent.click(toggleButton);

    expect(screen.getByText('KEY1')).toBeInTheDocument();
    expect(screen.getByText('KEY2')).toBeInTheDocument();
    expect(screen.getByText('KEY3')).toBeInTheDocument();
  });

  it('should toggle expandable section on click', () => {
    const conflicts = [
      {
        source1: 'Inline secret',
        source2: 'secret1',
        keys: ['KEY1'],
      },
    ];

    render(<EnvVarConflictWarning conflicts={conflicts} />);

    const toggleButton = screen.getByRole('button', { name: /show conflicts/i });

    expect(screen.queryByTestId('envvar-conflict-0')).not.toBeVisible();

    fireEvent.click(toggleButton);
    expect(screen.getByTestId('envvar-conflict-0')).toBeVisible();

    fireEvent.click(toggleButton);
    expect(screen.queryByTestId('envvar-conflict-0')).not.toBeVisible();
  });

  it('should use danger variant', () => {
    const conflicts = [
      {
        source1: 'Inline secret',
        source2: 'secret1',
        keys: ['KEY1'],
      },
    ];

    const { container } = render(<EnvVarConflictWarning conflicts={conflicts} />);

    const alert = container.querySelector('.pf-v6-c-alert.pf-m-danger');
    expect(alert).toBeInTheDocument();
  });
});
