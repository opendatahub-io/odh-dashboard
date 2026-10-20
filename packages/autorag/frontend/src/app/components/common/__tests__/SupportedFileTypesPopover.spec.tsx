import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import {
  SupportedFileTypesHelpButton,
  SupportedFileTypesLink,
} from '~/app/components/common/SupportedFileTypesPopover';

jest.mock('mod-arch-shared', () => ({
  DashboardPopupIconButton: ({ icon, ...props }: { icon: React.ReactNode }) => (
    <button {...props}>{icon}</button>
  ),
}));

describe('SupportedFileTypesPopover', () => {
  it('should show supported file types when the text trigger is activated', () => {
    render(<SupportedFileTypesLink />);

    fireEvent.click(screen.getByRole('button', { name: 'View supported file types' }));

    expect(screen.getByText('Supported file types')).toBeInTheDocument();
    expect(screen.getByText('Audio:').tagName).toBe('STRONG');
    expect(
      screen.getByText('Audio files are transcribed with Whisper Tiny before processing.'),
    ).toBeInTheDocument();
  });

  it('should render the link popover content inline so it stays within its host container', () => {
    render(
      <div data-testid="link-container">
        <SupportedFileTypesLink />
      </div>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'View supported file types' }));

    expect(screen.getByTestId('link-container')).toContainElement(
      screen.getByText('Supported file types'),
    );
  });

  it('should expose an accessible question-circle trigger', () => {
    render(<SupportedFileTypesHelpButton />);

    expect(screen.getByRole('button', { name: 'View supported file types' })).toBeInTheDocument();
  });
});
