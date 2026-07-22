import * as React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import DisableLastImageModal from '#~/pages/BYONImages/DisableLastImageModal';

describe('DisableLastImageModal', () => {
  it('should render with warning title and body text', () => {
    render(
      <DisableLastImageModal imageName="Test Image" onConfirm={jest.fn()} onClose={jest.fn()} />,
    );

    expect(screen.getByText('Disable last enabled image?')).toBeInTheDocument();
    expect(screen.getByText(/Test Image/)).toBeInTheDocument();
    expect(screen.getByText(/will leave no workbench images enabled/)).toBeInTheDocument();
  });

  it('should call onConfirm when Disable is clicked', () => {
    const onConfirm = jest.fn();
    render(
      <DisableLastImageModal imageName="Test Image" onConfirm={onConfirm} onClose={jest.fn()} />,
    );

    fireEvent.click(screen.getByTestId('confirm-disable-button'));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('should call onClose when Cancel is clicked', () => {
    const onClose = jest.fn();
    render(
      <DisableLastImageModal imageName="Test Image" onConfirm={jest.fn()} onClose={onClose} />,
    );

    fireEvent.click(screen.getByTestId('cancel-disable-button'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should disable buttons while submitting', () => {
    render(
      <DisableLastImageModal
        imageName="Test Image"
        onConfirm={jest.fn()}
        onClose={jest.fn()}
        isSubmitting
      />,
    );

    expect(screen.getByTestId('confirm-disable-button')).toBeDisabled();
    expect(screen.getByTestId('cancel-disable-button')).toBeDisabled();
  });

  it('should enable buttons when not submitting', () => {
    render(
      <DisableLastImageModal
        imageName="Test Image"
        onConfirm={jest.fn()}
        onClose={jest.fn()}
        isSubmitting={false}
      />,
    );

    expect(screen.getByTestId('confirm-disable-button')).not.toBeDisabled();
    expect(screen.getByTestId('cancel-disable-button')).not.toBeDisabled();
  });
});
