import * as React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react';
import { FileField } from '#~/concepts/connectionTypes/types';
import FileFormField from '#~/concepts/connectionTypes/fields/FileFormField';

describe('FileFormField', () => {
  it('should render editable field', () => {
    const onChange = jest.fn();
    const field: FileField = {
      type: 'file',
      name: 'test-name',
      envVar: 'test_envVar',
      properties: {
        defaultValue: 'default-value',
        extensions: ['.jpg', '.svg', '.png'],
      },
    };

    render(<FileFormField id="test" field={field} value="supplied-value" onChange={onChange} />);
    const [, contentInput] = screen.getAllByRole('textbox');
    expect(contentInput).toHaveValue('supplied-value');
    expect(contentInput).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Upload' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Clear' })).not.toBeDisabled();

    const helperText = screen.getByTestId('file-form-field-helper-text');
    expect(helperText).toHaveTextContent('.jpg, .svg, or .png');

    act(() => {
      fireEvent.change(contentInput, { target: { value: 'new-value' } });
    });
    // TODO why is there no callback?
    // expect(onChange).toHaveBeenCalledWith('new-value');
  });

  it('should render preview field', () => {
    const onChange = jest.fn();
    const field: FileField = {
      type: 'file',
      name: 'test-name',
      envVar: 'test_envVar',
      properties: {
        defaultValue: 'default-value',
      },
    };

    render(
      <FileFormField
        id="test"
        field={field}
        value="supplied-value"
        onChange={onChange}
        mode="preview"
      />,
    );
    const [, contentInput] = screen.getAllByRole('textbox');
    expect(contentInput).toHaveValue('default-value');
    expect(contentInput).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Upload' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled();

    act(() => {
      fireEvent.change(contentInput, { target: { value: 'new-value' } });
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('should render default value read only field', async () => {
    const onChange = jest.fn();
    const field: FileField = {
      type: 'file',
      name: 'test-name',
      envVar: 'test_envVar',
      properties: {
        defaultValue: 'default-value',
        defaultReadOnly: true,
      },
    };

    render(<FileFormField id="test" field={field} value="supplied-value" onChange={onChange} />);
    const [, contentInput] = screen.getAllByRole('textbox');
    expect(contentInput).toHaveValue('default-value');
    expect(contentInput).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Upload' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled();

    act(() => {
      fireEvent.change(contentInput, { target: { value: 'new-value' } });
    });
    expect(onChange).toHaveBeenCalled();
  });

  it('should render info helper text', async () => {
    const onChange = jest.fn();
    const field: FileField = {
      type: 'file',
      name: 'test-name',
      envVar: 'test_envVar',
      properties: {
        defaultValue: 'default-value',
        defaultReadOnly: true,
        helperText: 'Hello this is helper text',
      },
    };

    render(<FileFormField id="test" field={field} value="supplied-value" onChange={onChange} />);
    expect(screen.getByText('Hello this is helper text')).toBeVisible();
  });
});
