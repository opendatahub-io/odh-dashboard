import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ReplaceContentConfirmModal from '#~/pages/projects/projectRoles/ReplaceContentConfirmModal';

describe('ReplaceContentConfirmModal', () => {
  it('should render with correct title and body text', () => {
    render(<ReplaceContentConfirmModal onConfirm={jest.fn()} onClose={jest.fn()} />);

    expect(screen.getByText('Replace current content?')).toBeInTheDocument();
    expect(
      screen.getByText(/Selecting a template will replace the current form content/),
    ).toBeInTheDocument();
  });

  it('should render Continue and Cancel buttons', () => {
    render(<ReplaceContentConfirmModal onConfirm={jest.fn()} onClose={jest.fn()} />);

    expect(screen.getByTestId('replace-confirm-button')).toHaveTextContent('Continue');
    expect(screen.getByTestId('replace-cancel-button')).toHaveTextContent('Cancel');
  });

  it('should call onConfirm when Continue button is clicked', () => {
    const onConfirm = jest.fn();
    render(<ReplaceContentConfirmModal onConfirm={onConfirm} onClose={jest.fn()} />);

    fireEvent.click(screen.getByTestId('replace-confirm-button'));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when Cancel button is clicked', () => {
    const onClose = jest.fn();
    render(<ReplaceContentConfirmModal onConfirm={jest.fn()} onClose={onClose} />);

    fireEvent.click(screen.getByTestId('replace-cancel-button'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
