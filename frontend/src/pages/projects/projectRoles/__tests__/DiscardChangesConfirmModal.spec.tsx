import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DiscardChangesConfirmModal from '#~/pages/projects/projectRoles/DiscardChangesConfirmModal';

describe('DiscardChangesConfirmModal', () => {
  it('should render with correct title and body text', () => {
    render(<DiscardChangesConfirmModal onDiscard={jest.fn()} onClose={jest.fn()} />);

    expect(screen.getByText('Discard unsaved changes?')).toBeInTheDocument();
    expect(screen.getByText(/Your changes to this form are not saved yet/)).toBeInTheDocument();
  });

  it('should render Discard and Cancel buttons', () => {
    render(<DiscardChangesConfirmModal onDiscard={jest.fn()} onClose={jest.fn()} />);

    expect(screen.getByTestId('discard-confirm-button')).toHaveTextContent('Discard');
    expect(screen.getByTestId('discard-cancel-button')).toHaveTextContent('Cancel');
  });

  it('should call onDiscard when Discard button is clicked', () => {
    const onDiscard = jest.fn();
    render(<DiscardChangesConfirmModal onDiscard={onDiscard} onClose={jest.fn()} />);

    fireEvent.click(screen.getByTestId('discard-confirm-button'));

    expect(onDiscard).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when Cancel button is clicked', () => {
    const onClose = jest.fn();
    render(<DiscardChangesConfirmModal onDiscard={jest.fn()} onClose={onClose} />);

    fireEvent.click(screen.getByTestId('discard-cancel-button'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
