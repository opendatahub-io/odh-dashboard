import * as React from 'react';
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import DataFormFieldGroup from '~/concepts/connectionTypes/fields/DataFormFieldGroup';
import { TextField } from '~/concepts/connectionTypes/types';

describe('DataFormFieldGroup', () => {
  it('should conditionally render children', () => {
    const children = jest.fn();
    const field: TextField = {
      type: 'text',
      name: 'test-name',
      envVar: 'test-envVar',
      properties: {},
    };
    render(
      <DataFormFieldGroup field={field} isPreview={false}>
        {children}
      </DataFormFieldGroup>,
    );
    expect(children).toHaveBeenCalledWith('text-test-envVar');

    children.mockReset();
    field.properties.defaultReadOnly = true;
    render(
      <DataFormFieldGroup field={field} isPreview={false} renderDefaultValue={false}>
        {children}
      </DataFormFieldGroup>,
    );
    expect(children).toHaveBeenCalledWith('text-test-envVar');

    children.mockReset();
    render(
      <DataFormFieldGroup field={field} isPreview={false} renderDefaultValue>
        {children}
      </DataFormFieldGroup>,
    );
    expect(children).not.toHaveBeenCalled();

    children.mockReset();
    render(
      <DataFormFieldGroup field={field} isPreview={false} renderDefaultValue={false}>
        {children}
      </DataFormFieldGroup>,
    );
    expect(children).toHaveBeenCalledWith('text-test-envVar');
  });

  it('should render default text', () => {
    const children = jest.fn();
    const field: TextField = {
      type: 'text',
      name: 'test-name',
      envVar: 'test-envVar',
      properties: {
        defaultValue: 'Test value',
        defaultReadOnly: true,
      },
    };
    let result = render(
      <DataFormFieldGroup field={field} isPreview={false}>
        {children}
      </DataFormFieldGroup>,
    );
    expect(result.container).toHaveTextContent('Test value');

    field.properties.defaultValue = '';
    result = render(
      <DataFormFieldGroup field={field} isPreview={false}>
        {children}
      </DataFormFieldGroup>,
    );
    expect(result.container).not.toHaveTextContent('Unspecified');

    result = render(
      <DataFormFieldGroup field={field} isPreview>
        {children}
      </DataFormFieldGroup>,
    );
    expect(result.container).not.toHaveTextContent('Unspecified');
  });
});
