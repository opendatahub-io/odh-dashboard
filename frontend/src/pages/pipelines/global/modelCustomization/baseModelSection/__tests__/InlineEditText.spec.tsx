import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import InlineEditText from '#~/pages/pipelines/global/modelCustomization/baseModelSection/InlineEditText';
import '@testing-library/jest-dom';

describe('InlineEditText', () => {
  const mockOnSave = jest.fn();
  const mockCheckSupported = jest.fn();
  const mockOnEdit = jest.fn();

  const defaultProps = {
    text: 'Initial Text',
    onSave: mockOnSave,
    checkSupported: mockCheckSupported,
    unsupportedMessage: 'Unsupported text!',
    onEdit: mockOnEdit,
  };

  beforeEach(() => {
    mockOnSave.mockClear();
    mockCheckSupported.mockClear();
  });

  it('should render initial text and edit button', () => {
    render(<InlineEditText {...defaultProps} />);

    expect(screen.getByText('Initial Text')).toBeInTheDocument();
    expect(screen.getByLabelText('Edit')).toBeInTheDocument();
  });

  it('should show input text and save/cancel buttons when clicking edit', () => {
    render(<InlineEditText {...defaultProps} />);

    fireEvent.click(screen.getByLabelText('Edit'));

    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByLabelText('Save')).toBeInTheDocument();
    expect(screen.getByLabelText('Cancel')).toBeInTheDocument();
  });

  it('should save the new value when clicking on save button', () => {
    render(<InlineEditText {...defaultProps} />);

    fireEvent.click(screen.getByLabelText('Edit'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'New Text' } });
    fireEvent.click(screen.getByLabelText('Save'));

    expect(mockOnSave).toHaveBeenCalledWith('New Text');
  });

  it('should revert input value to initial text when clicking cancel', () => {
    render(<InlineEditText {...defaultProps} />);

    fireEvent.click(screen.getByLabelText('Edit'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'New Text' } });
    fireEvent.click(screen.getByLabelText('Cancel'));

    expect(screen.getByText('Initial Text')).toBeInTheDocument();
    expect(screen.queryByText('New Text')).not.toBeInTheDocument();
  });

  it('should show unsupported message when the value is supported', () => {
    mockCheckSupported.mockReturnValue(false);

    render(<InlineEditText {...defaultProps} />);

    fireEvent.click(screen.getByLabelText('Edit'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Unsupported Text' } });
    fireEvent.click(screen.getByLabelText('Save'));

    expect(screen.getByText('Unsupported text!')).toBeInTheDocument();
  });

  it('should not show unsupported message when the value is supported', () => {
    mockCheckSupported.mockReturnValue(true);

    render(<InlineEditText {...defaultProps} />);

    fireEvent.click(screen.getByLabelText('Edit'));
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Valid Text' } });

    expect(screen.queryByText('Unsupported text!')).not.toBeInTheDocument();
  });

  it('should show placeholder when input is empty', () => {
    render(<InlineEditText {...defaultProps} text="" />);

    expect(screen.getByText('Set a value ...')).toBeInTheDocument();
  });
});
