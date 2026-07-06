import * as React from 'react';
import '@testing-library/jest-dom';
import { render, within } from '@testing-library/react';
import { ConnectionTypeField } from '#~/concepts/connectionTypes/types';
import ConnectionTypeFormFields from '#~/concepts/connectionTypes/fields/ConnectionTypeFormFields';

const testFields: ConnectionTypeField[] = [
  {
    type: 'boolean',
    name: 'Boolean 1',
    envVar: 'boolean_1',
    properties: {},
  },
  {
    type: 'section',
    name: 'section-1',
  },
  {
    type: 'text',
    name: 'Text 1',
    envVar: 'text_1',
    properties: {},
  },
  {
    type: 'text',
    name: 'Text 2',
    envVar: 'text_2',
    properties: {},
  },
  {
    type: 'section',
    name: 'section-2',
  },
  {
    type: 'numeric',
    name: 'Numeric 1',
    envVar: 'numeric_1',
    properties: {},
  },
];
describe('ConnectionTypeFormFields', () => {
  it('should render sectioned fields', () => {
    const result = render(<ConnectionTypeFormFields fields={testFields} isPreview />);

    const [section1, section2] = result.getAllByTestId('fields-section');

    // test ungrouped fields
    within(result.container).getByTestId('field-group boolean boolean_1');
    expect(within(section1).queryByTestId('field-group boolean boolean_1')).toBe(null);
    expect(within(section2).queryByTestId('field-group boolean boolean_1')).toBe(null);

    within(section1).getByTestId('field-group text text_1');
    expect(within(section1).getByTestId('field text_1')).toHaveAttribute('id', 'field-text_1');
    within(section1).getByTestId('field-group text text_2');
    expect(within(section1).getByTestId('field text_2')).toHaveAttribute('id', 'field-text_2');
    expect(within(section2).getByTestId('field-group numeric numeric_1')).toBeInTheDocument();
    expect(within(section2).getByTestId('field numeric_1')).toHaveAttribute(
      'id',
      'field-numeric_1',
    );
  });
});
