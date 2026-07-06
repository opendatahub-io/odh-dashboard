import * as React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react';
import { NumericField } from '#~/concepts/connectionTypes/types';
import NumericFormField from '#~/concepts/connectionTypes/fields/NumericFormField';

describe('NumericFormField', () => {
  it('should render editable field', () => {
    const onChange = jest.fn();
    const field: NumericField = {
      type: 'numeric',
      name: 'test-name',
      envVar: 'test_envVar',
      properties: {
        defaultValue: 2,
      },
    };

    render(<NumericFormField id="test" field={field} value={3} onChange={onChange} />);
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveValue(3);
    expect(input).not.toBeDisabled();

    act(() => {
      fireEvent.change(input, { target: { value: 4 } });
    });
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('should render preview field', () => {
    const onChange = jest.fn();
    const field: NumericField = {
      type: 'numeric',
      name: 'test-name',
      envVar: 'test_envVar',
      properties: {
        defaultValue: 2,
      },
    };

    render(
      <NumericFormField id="test" field={field} value={3} onChange={onChange} mode="preview" />,
    );
    const input = screen.getByRole('spinbutton');
    expect(input).toHaveValue(2);
    expect(input).not.toBeDisabled();
    expect(input).toHaveAttribute('aria-readonly', 'true');

    act(() => {
      fireEvent.change(input, { target: { value: 4 } });
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('should render default value read only field', async () => {
    const field: NumericField = {
      type: 'numeric',
      name: 'test-name',
      envVar: 'test_envVar',
      properties: {
        defaultValue: 2,
        defaultReadOnly: true,
      },
    };

    render(<NumericFormField id="test" field={field} value={3} />);
    expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument();
    expect(screen.queryByText(2)).toBeInTheDocument();
  });
});
