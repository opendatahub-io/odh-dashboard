import React from 'react';
import { render, screen } from '@testing-library/react';
import { EnvVarConflict } from '#~/pages/projects/screens/spawner/environmentVariables/envVarConflictDetection';
import ExistingSecretConflictWarning from '#~/pages/projects/screens/spawner/environmentVariables/ExistingSecretConflictWarning';

describe('ExistingSecretConflictWarning', () => {
  it('should render nothing when conflicts array is empty', () => {
    const { container } = render(<ExistingSecretConflictWarning conflicts={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('should render a danger alert when conflicts exist', () => {
    const conflicts: EnvVarConflict[] = [
      { key: 'AWS_ACCESS_KEY_ID', sources: ['my-secret', 'Inline variable'] },
    ];

    render(<ExistingSecretConflictWarning conflicts={conflicts} />);

    const alert = screen.getByTestId('existing-secret-conflict-warning');
    expect(alert).toBeInTheDocument();
  });

  it('should display each conflicting key with its sources', () => {
    const conflicts: EnvVarConflict[] = [
      { key: 'AWS_ACCESS_KEY_ID', sources: ['my-secret', 'Inline variable'] },
    ];

    render(<ExistingSecretConflictWarning conflicts={conflicts} />);

    const conflictItem = screen.getByTestId('conflict-item-0');
    expect(conflictItem).toHaveTextContent('AWS_ACCESS_KEY_ID');
    expect(conflictItem).toHaveTextContent('my-secret');
    expect(conflictItem).toHaveTextContent('Inline variable');
  });

  it('should display multiple conflicts', () => {
    const conflicts: EnvVarConflict[] = [
      { key: 'DB_PASSWORD', sources: ['secret-a', 'secret-b'] },
      { key: 'API_KEY', sources: ['my-secret', 'Connection'] },
    ];

    render(<ExistingSecretConflictWarning conflicts={conflicts} />);

    expect(screen.getByTestId('conflict-item-0')).toHaveTextContent('DB_PASSWORD');
    expect(screen.getByTestId('conflict-item-1')).toHaveTextContent('API_KEY');
  });

  it('should use user-facing language describing the collision', () => {
    const conflicts: EnvVarConflict[] = [
      { key: 'AWS_ACCESS_KEY_ID', sources: ['my-secret', 'Inline variable'] },
    ];

    render(<ExistingSecretConflictWarning conflicts={conflicts} />);

    const conflictItem = screen.getByTestId('conflict-item-0');
    expect(conflictItem.textContent).toContain(
      "The environment variable 'AWS_ACCESS_KEY_ID' is already used by my-secret and Inline variable",
    );
  });

  it('should handle three or more sources with proper formatting', () => {
    const conflicts: EnvVarConflict[] = [
      { key: 'SHARED_KEY', sources: ['secret-a', 'secret-b', 'Connection'] },
    ];

    render(<ExistingSecretConflictWarning conflicts={conflicts} />);

    const conflictItem = screen.getByTestId('conflict-item-0');
    expect(conflictItem.textContent).toContain(
      "The environment variable 'SHARED_KEY' is already used by secret-a, secret-b, and Connection",
    );
  });
});
