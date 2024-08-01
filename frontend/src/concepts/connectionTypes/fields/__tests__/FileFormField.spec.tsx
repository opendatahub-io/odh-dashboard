import * as React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { FileField } from '~/concepts/connectionTypes/types';
import FileFormField from '~/concepts/connectionTypes/fields/FileFormField';

describe('FileFormField', () => {
  it('should render editable field', () => {
    const onChange = jest.fn();
    const field: FileField = {
      type: 'file',
      name: 'test-name',
      envVar: 'test-envVar',
      properties: {
        defaultValue: 'default-value',
      },
    };

    render(<FileFormField field={field} value="supplied-value" onChange={onChange} />);
    const [, contentInput] = screen.getAllByRole('textbox');
    expect(contentInput).toHaveValue('supplied-value');
    expect(contentInput).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Upload' })).not.toBeDisabled();
    expect(screen.getByRole('button', { name: 'Clear' })).not.toBeDisabled();

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
      envVar: 'test-envVar',
      properties: {
        defaultValue: 'default-value',
      },
    };

    render(<FileFormField field={field} value="supplied-value" onChange={onChange} isPreview />);
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
      envVar: 'test-envVar',
      properties: {
        defaultValue: 'default-value',
        defaultReadOnly: true,
      },
    };

    render(<FileFormField field={field} value="supplied-value" onChange={onChange} />);
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
});
