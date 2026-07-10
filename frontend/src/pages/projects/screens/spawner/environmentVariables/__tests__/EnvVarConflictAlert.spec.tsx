import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EnvVarConflictAlert } from '#~/pages/projects/screens/spawner/environmentVariables/EnvVarConflictAlert';
import { EnvVarConflict } from '#~/pages/projects/screens/spawner/environmentVariables/envVarConflicts';

describe('EnvVarConflictAlert', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render nothing when conflicts array is empty', () => {
    const { container } = render(<EnvVarConflictAlert conflicts={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render warning alert with conflict details when conflicts exist', () => {
    const conflicts: EnvVarConflict[] = [
      {
        key: 'API_KEY',
        sources: ['Environment variable', "Connection 'my-conn'"],
      },
      {
        key: 'DB_HOST',
        sources: ["Secret 'db-secret'", "Connection 'db-conn'"],
      },
    ];

    render(<EnvVarConflictAlert conflicts={conflicts} />);

    // Should render the alert
    const alert = screen.getByTestId('env-var-conflict-alert');
    expect(alert).toBeInTheDocument();

    // Should have warning variant
    expect(alert).toHaveClass('pf-m-warning');

    // Should show the alert title
    expect(screen.getByText('Environment variable conflicts')).toBeInTheDocument();
  });

  it('should toggle conflict list via ExpandableSection', () => {
    const conflicts: EnvVarConflict[] = [
      {
        key: 'API_KEY',
        sources: ['Environment variable', "Connection 'my-conn'"],
      },
    ];

    render(<EnvVarConflictAlert conflicts={conflicts} />);

    // Initially the conflict details should not be visible
    expect(screen.queryByTestId('env-var-conflict-0')).not.toBeVisible();

    // Click "Show conflicts" toggle
    const toggleButton = screen.getByRole('button', { name: /show conflicts/i });
    fireEvent.click(toggleButton);

    // Now the conflict details should be visible
    expect(screen.getByTestId('env-var-conflict-0')).toBeVisible();
    expect(screen.getByText('API_KEY')).toBeVisible();
    expect(screen.getByText('Environment variable')).toBeVisible();
    expect(screen.getByText("Connection 'my-conn'")).toBeVisible();

    // Click "Hide conflicts" toggle
    const hideButton = screen.getByRole('button', { name: /hide conflicts/i });
    fireEvent.click(hideButton);

    // Conflict details should be hidden again
    expect(screen.queryByTestId('env-var-conflict-0')).not.toBeVisible();
  });
});
