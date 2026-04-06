import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import WorkbenchMigrationLabel from '#~/pages/projects/screens/detail/notebooks/WorkbenchMigrationLabel';

describe('WorkbenchMigrationLabel', () => {
  it('should render the migration required label', () => {
    render(<WorkbenchMigrationLabel />);

    expect(screen.getByTestId('workbench-migration-required-label')).toHaveTextContent(
      'Migration required',
    );
  });

  it('should show the migration guidance popover when clicked', async () => {
    const user = userEvent.setup();

    render(<WorkbenchMigrationLabel />);

    await user.click(screen.getByTestId('workbench-migration-required-label'));

    expect(screen.getByTestId('workbench-migration-required-popover-title')).toHaveTextContent(
      'Migration required',
    );
    expect(screen.getByTestId('workbench-migration-required-popover')).toHaveTextContent(
      'To prevent access issues, migrate this workbench by editing the workbench description and saving.',
    );
    expect(screen.getByTestId('workbench-migration-required-popover')).toHaveTextContent(
      'Alternatively, delete this workbench and create a new one using the same cluster storage to preserve user data.',
    );
    expect(screen.getByTestId('workbench-migration-required-popover')).toHaveTextContent(
      'Note: Once migrated, the old URL will no longer work. Access the new URL by clicking on the name link.',
    );
  });
});
