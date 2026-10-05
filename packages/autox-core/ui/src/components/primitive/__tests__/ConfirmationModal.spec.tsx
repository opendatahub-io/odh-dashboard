import '@testing-library/jest-dom';
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ConfirmationModal from '../ConfirmationModal';

describe('ConfirmationModal', () => {
  it('renders the title and body content', () => {
    render(
      <ConfirmationModal
        title="Are you sure?"
        submitLabel="Confirm"
        onConfirm={jest.fn()}
        onClose={jest.fn()}
      >
        <p>Some body content.</p>
      </ConfirmationModal>,
    );

    expect(screen.getByRole('heading', { name: 'Are you sure?' })).toBeInTheDocument();
    expect(screen.getByText('Some body content.')).toBeInTheDocument();
  });

  it('calls onConfirm when the submit button is clicked', () => {
    const onConfirm = jest.fn();
    render(
      <ConfirmationModal
        title="Are you sure?"
        submitLabel="Confirm"
        onConfirm={onConfirm}
        onClose={jest.fn()}
      >
        <p>Body</p>
      </ConfirmationModal>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when the cancel button is clicked', () => {
    const onClose = jest.fn();
    render(
      <ConfirmationModal
        title="Are you sure?"
        submitLabel="Confirm"
        onConfirm={jest.fn()}
        onClose={onClose}
      >
        <p>Body</p>
      </ConfirmationModal>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('disables the submit button when isSubmitDisabled is true', () => {
    render(
      <ConfirmationModal
        title="Are you sure?"
        submitLabel="Confirm"
        onConfirm={jest.fn()}
        onClose={jest.fn()}
        isSubmitDisabled
      >
        <p>Body</p>
      </ConfirmationModal>,
    );

    expect(screen.getByRole('button', { name: 'Confirm' })).toBeDisabled();
  });
});
