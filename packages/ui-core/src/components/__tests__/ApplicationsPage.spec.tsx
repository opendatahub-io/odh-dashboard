import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ApplicationsPage from '../ApplicationsPage';

const renderPage = (removeHeaderBottomPadding?: boolean) =>
  render(
    <ApplicationsPage
      title="Test page"
      loaded
      empty={false}
      removeHeaderBottomPadding={removeHeaderBottomPadding}
    >
      <div data-testid="page-content">Content</div>
    </ApplicationsPage>,
  );

describe('ApplicationsPage', () => {
  it('removes the header bottom padding when requested', () => {
    renderPage(true);

    expect(screen.getByTestId('app-page-title').closest('section')).toHaveStyle({
      paddingBottom: '0px',
    });
  });

  it('keeps the default header padding when the option is omitted', () => {
    renderPage();

    expect(screen.getByTestId('app-page-title').closest('section')).not.toHaveAttribute('style');
  });
});
