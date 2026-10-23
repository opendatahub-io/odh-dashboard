import '@testing-library/jest-dom';
import {
  fireEvent,
  render,
  screen,
  waitForElementToBeRemoved,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import FileExplorer from '@odh-dashboard/internal/concepts/fileExplorer/FileExplorer/FileExplorer';
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

  it('should close only the popover before closing the file explorer on Escape', async () => {
    const user = userEvent.setup();
    const onClose = jest.fn();
    const file = { name: 'document.txt', path: '/document.txt', type: 'txt' };

    render(
      <FileExplorer
        isOpen
        onClose={onClose}
        onPrimary={jest.fn()}
        files={[file]}
        source={{ name: 'S3 connection', bucket: 'test-bucket' }}
        modalDescription={<SupportedFileTypesLink />}
      />,
    );

    const row = screen.getByTestId('file-explorer-row--document-txt');
    await user.click(within(row).getByRole('radio'));
    expect(screen.getByTestId('file-explorer-select-btn')).not.toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'View supported file types' }));
    expect(screen.getByText('Supported file types')).toBeInTheDocument();

    await user.keyboard('{Escape}');
    await waitForElementToBeRemoved(() => screen.queryByText('Supported file types'));

    expect(screen.getByRole('dialog', { name: 'Select file or folder' })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByTestId('file-explorer-select-btn')).not.toBeDisabled();

    await user.keyboard('{Escape}');

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('file-explorer-select-btn')).toBeDisabled();
  });
});
