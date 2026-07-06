import * as React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react';
import { HiddenField } from '#~/concepts/connectionTypes/types';
import HiddenFormField from '#~/concepts/connectionTypes/fields/HiddenFormField';

describe('HiddenFormField', () => {
  it('should render editable field', () => {
    const onChange = jest.fn();
    const field: HiddenField = {
      type: 'hidden',
      name: 'test-name',
      envVar: 'test_envVar',
      properties: {
        defaultValue: 'default-value',
      },
    };

    const result = render(
      <HiddenFormField id="test" field={field} value="supplied-value" onChange={onChange} />,
    );
    const input = result.container.getElementsByTagName('input')[0];
    expect(input.getAttribute('type')).toBe('password');
    expect(input).toHaveValue('supplied-value');
    expect(input).not.toBeDisabled();

    act(() => {
      fireEvent.change(input, { target: { value: 'new-value' } });
    });
    expect(onChange).toHaveBeenCalledWith('new-value');
  });

  it('should render preview field', () => {
    const onChange = jest.fn();
    const field: HiddenField = {
      type: 'hidden',
      name: 'test-name',
      envVar: 'test_envVar',
      properties: {
        defaultValue: 'default-value',
      },
    };

    const result = render(
      <HiddenFormField
        id="test"
        field={field}
        value="supplied-value"
        onChange={onChange}
        mode="preview"
      />,
    );
    const input = result.container.getElementsByTagName('input')[0];
    expect(input.getAttribute('type')).toBe('password');
    expect(input).toHaveValue('default-value');
    expect(input).not.toBeDisabled();
    expect(input).toHaveAttribute('aria-readonly', 'true');

    act(() => {
      fireEvent.change(input, { target: { value: 'new-value' } });
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('should render default value read only field', async () => {
    const field: HiddenField = {
      type: 'hidden',
      name: 'test-name',
      envVar: 'test_envVar',
      properties: {
        defaultValue: 'default-value',
        defaultReadOnly: true,
      },
    };

    render(<HiddenFormField id="test" field={field} value="supplied-value" />);
    expect(screen.queryByRole('test-name')).not.toBeInTheDocument();
    expect(screen.queryByText('•••••••••••••')).toBeInTheDocument();
  });
});
