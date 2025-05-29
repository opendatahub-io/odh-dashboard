import * as React from 'react';
import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import DefaultValueTextRenderer from '#~/concepts/connectionTypes/fields/DefaultValueTextRenderer';
import { TextField } from '#~/concepts/connectionTypes/types';

describe('DefaultValueTextRenderer', () => {
  it('should render default text', () => {
    const field: TextField = {
      type: 'text',
      name: 'test-name',
      envVar: 'test_envVar',
      properties: {
        defaultValue: 'Test value',
        defaultReadOnly: true,
      },
    };
    let result = render(
      <DefaultValueTextRenderer id="test" field={field}>
        children
      </DefaultValueTextRenderer>,
    );
    expect(result.container).toHaveTextContent('Test value');

    field.properties.defaultValue = undefined;
    result = render(
      <DefaultValueTextRenderer id="test" field={field} mode="default">
        children
      </DefaultValueTextRenderer>,
    );
    expect(result.container).not.toHaveTextContent('Unspecified');
    expect(result.container).toHaveTextContent('children');

    result = render(
      <DefaultValueTextRenderer id="test" field={field} mode="instance">
        children
      </DefaultValueTextRenderer>,
    );
    expect(result.container).not.toHaveTextContent('Unspecified');
    expect(result.container).toHaveTextContent('-');

    result = render(
      <DefaultValueTextRenderer id="test" field={field} mode="preview">
        children
      </DefaultValueTextRenderer>,
    );
    expect(result.container).toHaveTextContent('Unspecified');
  });
});
