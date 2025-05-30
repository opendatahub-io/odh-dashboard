import * as React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { UriField } from '#~/concepts/connectionTypes/types';
import UriFormField from '#~/concepts/connectionTypes/fields/UriFormField';

describe('UriFormField', () => {
  it('should render editable field', () => {
    const onChange = jest.fn();
    const field: UriField = {
      type: 'uri',
      name: 'test-name',
      envVar: 'test_envVar',
      properties: {
        defaultValue: 'http://foo.com',
      },
    };

    render(<UriFormField id="test" field={field} value="http://bar.com" onChange={onChange} />);
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('http://bar.com');
    expect(input).not.toBeDisabled();

    React.act(() => {
      fireEvent.change(input, { target: { value: 'http://new.com' } });
    });
    expect(onChange).toHaveBeenCalledWith('http://new.com');
  });

  it('should render preview field', () => {
    const onChange = jest.fn();
    const field: UriField = {
      type: 'uri',
      name: 'test-name',
      envVar: 'test_envVar',
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

    React.act(() => {
      fireEvent.change(input, { target: { value: 'http://new.com' } });
    });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('should render default value read only field', async () => {
    const field: UriField = {
      type: 'uri',
      name: 'test-name',
      envVar: 'test_envVar',
      properties: {
        defaultValue: 'http://foo.com',
        defaultReadOnly: true,
      },
    };

    render(<UriFormField id="test" field={field} value="http://bar.com" />);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.queryByText('http://foo.com')).toBeInTheDocument();
  });

  it('should validate the URI entry', async () => {
    const field: UriField = {
      type: 'uri',
      name: 'test-name',
      envVar: 'test_envVar',
      properties: {
        defaultValue: 'http://foo.com',
        defaultReadOnly: false,
      },
    };
    let renderResult;

    const validURIs = [
      'http://www.someplace.com',
      'https://www.someplace.com:9090/blah',
      'http://www.ics.uci.edu/pub/ietf/uri?name=test/#Related',
      'ftp://ftp.someplace.com:9090/blah/test.tst',
      'file://var/log/some-log.log',
      'file:/www.someplace.com:9090/c:/mydir/myfile.csv.gz',
      'file:/www.someplace.com:9090/spaces are allowed/my file with no extension',
      'gs://',
      's3://',
      'hdfs://',
      'webhdfs://',
      'model-registry://iris/v1',
      'pvc://PVC-NAME/model.joblib',
    ];
    validURIs.forEach((uri) => {
      renderResult = render(<UriFormField id="test" field={field} value={uri} />);
      expect(screen.queryByTestId('uri-form-field-helper-text')).not.toBeInTheDocument();
      renderResult.unmount();
    });

    const invalidURIs = [
      '://www.someplace.com:9090/blah',
      'https://www.something ?#?!@#$%&()!@#$%&(?#>/.,/ is this valid',
    ];
    invalidURIs.forEach((uri) => {
      renderResult = render(<UriFormField id="test" field={field} value={uri} />);
      expect(screen.queryByTestId('uri-form-field-helper-text')).toBeInTheDocument();
      renderResult.unmount();
    });
  });
});
