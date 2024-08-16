import * as React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { UriField } from '~/concepts/connectionTypes/types';
import UriFormField from '~/concepts/connectionTypes/fields/UriFormField';

describe('UriFormField', () => {
  it('should render editable field', () => {
    const onChange = jest.fn();
    const field: UriField = {
      type: 'uri',
      name: 'test-name',
      envVar: 'test-envVar',
      properties: {
        defaultValue: 'http://foo.com',
      },
    };

    render(<UriFormField id="test" field={field} value="http://bar.com" onChange={onChange} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('http://bar.com');
    expect(input).not.toBeDisabled();

    act(() => {
      fireEvent.change(input, { target: { value: 'http://new.com' } });
    });
    expect(onChange).toHaveBeenCalledWith('http://new.com');
  });

  it('should render preview field', () => {
    const onChange = jest.fn();
    const field: UriField = {
      type: 'uri',
      name: 'test-name',
      envVar: 'test-envVar',
      properties: {
        defaultValue: 'http://foo.com',
      },
    };

    render(
      <UriFormField
        id="test"
        field={field}
        value="http://bar.com"
        onChange={onChange}
        mode="preview"
      />,
    );
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('http://foo.com');
    expect(input).not.toBeDisabled();
    expect(input).toHaveAttribute('aria-readonly', 'true');

    act(() => {
      fireEvent.change(input, { target: { value: 'http://new.com' } });
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('should render default value read only field', async () => {
    const field: UriField = {
      type: 'uri',
      name: 'test-name',
      envVar: 'test-envVar',
      properties: {
        defaultValue: 'http://foo.com',
        defaultReadOnly: true,
      },
    };

    render(<UriFormField id="test" field={field} value="http://bar.com" />);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByText('http://foo.com')).toBeInTheDocument();
  });
});
