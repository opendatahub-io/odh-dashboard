import * as React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react';
import { TextField } from '#~/concepts/connectionTypes/types';
import TextFormField from '#~/concepts/connectionTypes/fields/TextFormField';

describe('TextFormField', () => {
  it('should render editable field', () => {
    const onChange = jest.fn();
    const field: TextField = {
      type: 'text',
      name: 'test-name',
      envVar: 'test_envVar',
      properties: {
        defaultValue: 'default-value',
      },
    };

    render(<TextFormField id="test" field={field} value="supplied-value" onChange={onChange} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('supplied-value');
    expect(input).not.toBeDisabled();

    act(() => {
      fireEvent.change(input, { target: { value: 'new-value' } });
    });
    expect(onChange).toHaveBeenCalledWith('new-value');
  });

  it('should render preview field', () => {
    const onChange = jest.fn();
    const field: TextField = {
      type: 'text',
      name: 'test-name',
      envVar: 'test_envVar',
      properties: {
        defaultValue: 'default-value',
      },
    };

    render(
      <TextFormField
        id="test"
        field={field}
        value="supplied-value"
        onChange={onChange}
        mode="preview"
      />,
    );
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('default-value');
    expect(input).not.toBeDisabled();
    expect(input).toHaveAttribute('aria-readonly', 'true');

    act(() => {
      fireEvent.change(input, { target: { value: 'new-value' } });
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('should render default value read only field', async () => {
    const field: TextField = {
      type: 'text',
      name: 'test-name',
      envVar: 'test_envVar',
      properties: {
        defaultValue: 'default-value',
        defaultReadOnly: true,
      },
    };

    render(<TextFormField id="test" field={field} value="supplied-value" />);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByText('default-value')).toBeInTheDocument();
  });
});
