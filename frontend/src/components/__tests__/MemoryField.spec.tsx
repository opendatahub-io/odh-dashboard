import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import MemoryField, { MemoryFieldWithCheckbox } from '#~/components/MemoryField';

describe('MemoryField', () => {
  const mockOnChange = jest.fn();
  const mockOnBlur = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic MemoryField', () => {
    it('should render memory field', () => {
      render(<MemoryField onChange={mockOnChange} value="2Gi" dataTestId="memory-field" />);

      // Should render the input element
      expect(screen.getByLabelText('Input')).toBeInTheDocument();
      // Should show GiB unit by default (the component converts Gi to GiB for display)
      expect(screen.getByText('GiB')).toBeInTheDocument();
      // Value should be in the input
      expect(screen.getByLabelText('Input')).toHaveValue(2);
    });

    it('should call onChange when value changes', () => {
      render(<MemoryField onChange={mockOnChange} value="1Gi" dataTestId="memory-field" />);

      const input = screen.getByLabelText('Input');
      fireEvent.change(input, { target: { value: '2' } });

      expect(mockOnChange).toHaveBeenCalledWith('2Gi');
    });

    it('should call onBlur when field loses focus', () => {
      render(
        <MemoryField
          onChange={mockOnChange}
          onBlur={mockOnBlur}
          value="1Gi"
          dataTestId="memory-field"
        />,
      );

      const input = screen.getByLabelText('Input');
      fireEvent.blur(input);

      expect(mockOnBlur).toHaveBeenCalled();
    });

    it('should be disabled when isDisabled is true', () => {
      render(
        <MemoryField onChange={mockOnChange} value="1Gi" isDisabled dataTestId="memory-field" />,
      );

      const input = screen.getByLabelText('Input');
      expect(input).toBeDisabled();
    });

    it('should show error validation state', () => {
      render(
        <MemoryField
          onChange={mockOnChange}
          value="invalid"
          validated="error"
          dataTestId="memory-field"
        />,
      );

      const input = screen.getByLabelText('Input');
      expect(input).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('MemoryFieldWithCheckbox', () => {
    const defaultProps = {
      checkboxId: 'memory-checkbox',
      label: 'Memory Resource',
      onChange: mockOnChange,
      dataTestId: 'memory-field',
    };

    it('should render checkbox and field', () => {
      render(<MemoryFieldWithCheckbox {...defaultProps} value="2Gi" />);

      expect(screen.getByRole('checkbox')).toBeInTheDocument();
      expect(screen.getByLabelText('Memory Resource')).toBeInTheDocument();
      expect(screen.getByLabelText('Input')).toBeInTheDocument();
    });

    it('should check checkbox when value is defined', () => {
      render(<MemoryFieldWithCheckbox {...defaultProps} value="2Gi" />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    it('should uncheck checkbox when value is undefined', () => {
      render(<MemoryFieldWithCheckbox {...defaultProps} value={undefined} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
    });

    it('should disable field when checkbox is unchecked', () => {
      render(<MemoryFieldWithCheckbox {...defaultProps} value={undefined} />);

      const input = screen.getByLabelText('Input');
      expect(input).toBeDisabled();
    });

    it('should enable field when checkbox is checked', () => {
      render(<MemoryFieldWithCheckbox {...defaultProps} value="2Gi" />);

      const input = screen.getByLabelText('Input');
      expect(input).not.toBeDisabled();
    });

    it('should call onChange with undefined when checkbox is unchecked', () => {
      render(<MemoryFieldWithCheckbox {...defaultProps} value="2Gi" />);

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      expect(mockOnChange).toHaveBeenCalledWith(undefined);
    });

    it('should call onChange with default value when checkbox is checked', () => {
      render(<MemoryFieldWithCheckbox {...defaultProps} value={undefined} />);

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      expect(mockOnChange).toHaveBeenCalledWith('1Gi');
    });

    it('should restore previous value when checkbox is checked again', () => {
      const { rerender } = render(<MemoryFieldWithCheckbox {...defaultProps} value="4Gi" />);

      const checkbox = screen.getByRole('checkbox');

      // Uncheck to store the value
      fireEvent.click(checkbox);
      expect(mockOnChange).toHaveBeenCalledWith(undefined);

      // Rerender with undefined value
      rerender(<MemoryFieldWithCheckbox {...defaultProps} value={undefined} />);

      // Check again to restore
      fireEvent.click(checkbox);
      expect(mockOnChange).toHaveBeenCalledWith('4Gi');
    });

    it('should display Zod validation errors', () => {
      const zodIssue = {
        code: 'custom' as const,
        path: ['memory'],
        message: 'Invalid memory value',
      };

      render(<MemoryFieldWithCheckbox {...defaultProps} value="invalid" zodIssue={zodIssue} />);

      expect(screen.getByText('Invalid memory value')).toBeInTheDocument();
    });

    it('should be disabled when isDisabled prop is true', () => {
      render(<MemoryFieldWithCheckbox {...defaultProps} value="2Gi" isDisabled />);

      const checkbox = screen.getByRole('checkbox');
      const input = screen.getByLabelText('Input');

      expect(checkbox).toBeDisabled();
      expect(input).toBeDisabled();
    });

    it('should handle multiple Zod issues', () => {
      const zodIssues = [
        {
          code: 'custom' as const,
          path: ['memory'],
          message: 'First error',
        },
        {
          code: 'custom' as const,
          path: ['memory'],
          message: 'Second error',
        },
      ];

      render(<MemoryFieldWithCheckbox {...defaultProps} value="invalid" zodIssue={zodIssues} />);

      // Should only display the first error by default
      expect(screen.getByText('First error')).toBeInTheDocument();
      expect(screen.queryByText('Second error')).not.toBeInTheDocument();
    });

    it('should handle different memory units', () => {
      render(<MemoryFieldWithCheckbox {...defaultProps} value="512Mi" />);

      // Should show the value in the input
      expect(screen.getByLabelText('Input')).toHaveValue(512);
      // Should show the unit (Mi becomes MiB for display)
      expect(screen.getByText('MiB')).toBeInTheDocument();
    });
  });
});
