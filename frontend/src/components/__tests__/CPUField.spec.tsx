import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent } from '@testing-library/react';
import { ValidatedOptions } from '@patternfly/react-core';
import CPUField, { CPUFieldWithCheckbox } from '#~/components/CPUField';

describe('CPUField', () => {
  const mockOnChange = jest.fn();
  const mockOnBlur = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic CPUField', () => {
    it('should render with default value', () => {
      render(<CPUField onChange={mockOnChange} value="2" dataTestId="cpu-field" />);

      expect(screen.getByLabelText('Input')).toHaveValue(2);
    });

    it('should render with empty value when value is undefined', () => {
      render(<CPUField onChange={mockOnChange} dataTestId="cpu-field" />);

      expect(screen.getByLabelText('Input')).toHaveValue(null);
    });

    it('should call onChange when value changes', () => {
      render(<CPUField onChange={mockOnChange} value="1" dataTestId="cpu-field" />);

      fireEvent.change(screen.getByLabelText('Input'), { target: { value: '2' } });
      expect(mockOnChange).toHaveBeenCalledWith('2');
    });

    it('should call onBlur when field loses focus', () => {
      render(
        <CPUField onChange={mockOnChange} onBlur={mockOnBlur} value="1" dataTestId="cpu-field" />,
      );

      fireEvent.blur(screen.getByLabelText('Input'));

      expect(mockOnBlur).toHaveBeenCalled();
    });

    it('should be disabled when isDisabled is true', () => {
      render(<CPUField onChange={mockOnChange} value="1" isDisabled dataTestId="cpu-field" />);

      expect(screen.getByLabelText('Input')).toBeDisabled();
    });

    it('should show error validation state', () => {
      render(
        <CPUField
          onChange={mockOnChange}
          value="invalid"
          validated={ValidatedOptions.error}
          dataTestId="cpu-field"
        />,
      );

      expect(screen.getByLabelText('Input')).toHaveAttribute('aria-invalid', 'true');
    });
  });

  describe('CPUFieldWithCheckbox', () => {
    const defaultProps = {
      checkboxId: 'cpu-checkbox',
      label: 'CPU Resource',
      onChange: mockOnChange,
      dataTestId: 'cpu-field',
    };

    it('should render checkbox and field', () => {
      render(<CPUFieldWithCheckbox {...defaultProps} value="2" />);

      expect(screen.getByRole('checkbox')).toBeInTheDocument();
      expect(screen.getByLabelText('CPU Resource')).toBeInTheDocument();
      expect(screen.getByLabelText('Input')).toBeInTheDocument();
    });

    it('should check checkbox when value is defined', () => {
      render(<CPUFieldWithCheckbox {...defaultProps} value="2" />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).toBeChecked();
    });

    it('should uncheck checkbox when value is undefined', () => {
      render(<CPUFieldWithCheckbox {...defaultProps} />);

      const checkbox = screen.getByRole('checkbox');
      expect(checkbox).not.toBeChecked();
    });

    it('should disable field when checkbox is unchecked', () => {
      render(<CPUFieldWithCheckbox {...defaultProps} value={undefined} />);

      expect(screen.getByLabelText('Input')).toBeDisabled();
    });

    it('should enable field when checkbox is checked', () => {
      render(<CPUFieldWithCheckbox {...defaultProps} value="2" />);

      expect(screen.getByLabelText('Input')).not.toBeDisabled();
    });

    it('should call onChange with undefined when checkbox is unchecked', () => {
      render(<CPUFieldWithCheckbox {...defaultProps} value="2" />);

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      expect(mockOnChange).toHaveBeenCalledWith(undefined);
    });

    it('should call onChange with default value when checkbox is checked', () => {
      render(<CPUFieldWithCheckbox {...defaultProps} value={undefined} />);

      const checkbox = screen.getByRole('checkbox');
      fireEvent.click(checkbox);

      expect(mockOnChange).toHaveBeenCalledWith('1');
    });

    it('should restore previous value when checkbox is checked again', () => {
      const { rerender } = render(<CPUFieldWithCheckbox {...defaultProps} value="4" />);

      const checkbox = screen.getByRole('checkbox');

      // Uncheck to store the value
      fireEvent.click(checkbox);
      expect(mockOnChange).toHaveBeenCalledWith(undefined);

      // Rerender with undefined value
      rerender(<CPUFieldWithCheckbox {...defaultProps} value={undefined} />);

      // Check again to restore
      fireEvent.click(checkbox);
      expect(mockOnChange).toHaveBeenCalledWith('4');
    });

    it('should display Zod validation errors', () => {
      const zodIssue = {
        code: 'custom' as const,
        path: ['cpu'],
        message: 'Invalid CPU value',
      };

      render(<CPUFieldWithCheckbox {...defaultProps} value="invalid" zodIssue={zodIssue} />);

      expect(screen.getByText('Invalid CPU value')).toBeInTheDocument();
    });

    it('should be disabled when isDisabled prop is true', () => {
      render(<CPUFieldWithCheckbox {...defaultProps} value="2" isDisabled />);

      expect(screen.getByRole('checkbox')).toBeDisabled();
      expect(screen.getByLabelText('Input')).toBeDisabled();
    });

    it('should handle multiple Zod issues', () => {
      const zodIssues = [
        {
          code: 'custom' as const,
          path: ['cpu'],
          message: 'First error',
        },
        {
          code: 'custom' as const,
          path: ['cpu'],
          message: 'Second error',
        },
      ];

      render(<CPUFieldWithCheckbox {...defaultProps} value="invalid" zodIssue={zodIssues} />);

      // Should only display the first error by default
      expect(screen.getByText('First error')).toBeInTheDocument();
      expect(screen.queryByText('Second error')).not.toBeInTheDocument();
    });
  });
});
