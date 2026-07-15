import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { EnvVarConflict } from '#~/pages/projects/screens/spawner/environmentVariables/envVarConflicts';
import EnvVarConflictWarning from '#~/pages/projects/screens/spawner/environmentVariables/EnvVarConflictWarning';

describe('EnvVarConflictWarning', () => {
  it('should render warning alert with correct title', () => {
    const conflicts: EnvVarConflict[] = [
      { key: 'DB_HOST', sources: ["Secret 'db-creds'", "Secret 'other-creds'"] },
    ];

    render(<EnvVarConflictWarning conflicts={conflicts} />);

    expect(screen.getByTestId('env-var-conflict-warning')).toBeInTheDocument();
    expect(screen.getByText('Environment variable conflicts')).toBeInTheDocument();
  });

  it('should show conflict details in expandable section', () => {
    const conflicts: EnvVarConflict[] = [
      { key: 'API_KEY', sources: ["Secret 'secret-a'", "Connection 'my-conn'"] },
    ];

    render(<EnvVarConflictWarning conflicts={conflicts} />);

    // Click the expandable toggle
    fireEvent.click(screen.getByText('Show conflicts'));

    expect(screen.getByText(/API_KEY/)).toBeInTheDocument();
  });

  it('should render multiple conflicts', () => {
    const conflicts: EnvVarConflict[] = [
      { key: 'KEY1', sources: ["Secret 'a'", "Secret 'b'"] },
      { key: 'KEY2', sources: ["Secret 'c'", "Connection 'd'"] },
    ];

    render(<EnvVarConflictWarning conflicts={conflicts} />);

    fireEvent.click(screen.getByText('Show conflicts'));

    expect(screen.getByText(/KEY1/)).toBeInTheDocument();
    expect(screen.getByText(/KEY2/)).toBeInTheDocument();
  });

  it('should show source information for each conflict', () => {
    const conflicts: EnvVarConflict[] = [
      { key: 'DB_HOST', sources: ["Secret 'db-creds'", "Connection 'my-conn'"] },
    ];

    render(<EnvVarConflictWarning conflicts={conflicts} />);

    fireEvent.click(screen.getByText('Show conflicts'));

    expect(screen.getByText(/Secret 'db-creds'/)).toBeInTheDocument();
    expect(screen.getByText(/Connection 'my-conn'/)).toBeInTheDocument();
  });
});
