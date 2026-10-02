import * as React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import UriConnectionFormFields, { createTiltUriConnectionType } from '../UriConnectionFixture';

describe('UriConnectionFixture', () => {
  it('creates an enabled URI-compatible connection type in the dashboard namespace', () => {
    expect(createTiltUriConnectionType('opendatahub')).toEqual(
      expect.objectContaining({
        metadata: expect.objectContaining({
          name: 'uri-v1',
          namespace: 'opendatahub',
          annotations: expect.objectContaining({ 'opendatahub.io/disabled': 'false' }),
        }),
        data: {
          fields: [expect.objectContaining({ envVar: 'URI', required: true, type: 'uri' })],
        },
      }),
    );
  });

  it('renders the URI field and reports changes', () => {
    const onChange = jest.fn();
    const connectionType = createTiltUriConnectionType('opendatahub');

    render(
      <UriConnectionFormFields
        fields={connectionType.data?.fields}
        onChange={onChange}
        connectionValues={{}}
      />,
    );

    fireEvent.change(screen.getByTestId('rhaii-tilt-model-uri'), {
      target: { value: 'oci://registry.example.test/model' },
    });

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ envVar: 'URI' }),
      'oci://registry.example.test/model',
    );
  });

  it('trims the URI on blur', () => {
    const onChange = jest.fn();
    const connectionType = createTiltUriConnectionType('opendatahub');

    render(
      <UriConnectionFormFields
        fields={connectionType.data?.fields}
        onChange={onChange}
        connectionValues={{ URI: '  oci://registry.example.test/model  ' }}
      />,
    );

    fireEvent.blur(screen.getByTestId('rhaii-tilt-model-uri'));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ envVar: 'URI' }),
      'oci://registry.example.test/model',
    );
  });
});
