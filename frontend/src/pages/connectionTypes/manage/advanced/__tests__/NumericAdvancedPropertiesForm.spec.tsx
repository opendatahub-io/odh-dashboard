import * as React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { act } from 'react';
import NumericAdvancedPropertiesForm from '#~/pages/connectionTypes/manage/advanced/NumericAdvancedPropertiesForm';
import { ConnectionTypeFieldType, NumericField } from '#~/concepts/connectionTypes/types';

let onChange: jest.Mock;
let onValidate: jest.Mock;
let field: NumericField;

describe('DataFieldAdvancedPropertiesForm', () => {
  beforeEach(() => {
    onChange = jest.fn();
    onValidate = jest.fn();
    field = {
      type: ConnectionTypeFieldType.Numeric,
      name: 'Test Number',
      envVar: 'TEST_NUMBER',
      properties: {},
    };
  });

  it('should show the empty state', () => {
    render(
      <NumericAdvancedPropertiesForm
        properties={{}}
        field={field}
        onChange={onChange}
        onValidate={onValidate}
      />,
    );

    const lowerThreshold = screen.getByTestId('lower-threshold');
    expect(lowerThreshold).not.toBeVisible();

    const advancedToggle = screen.getByTestId('advanced-settings-toggle');
    const toggleButton = within(advancedToggle).getByRole('button');

    act(() => {
      toggleButton.click();
    });

    expect(lowerThreshold).toBeVisible();
    act(() => {
      fireEvent.change(lowerThreshold, { target: { value: '10' } });
    });

    const upperThreshold = screen.getByTestId('upper-threshold');
    act(() => {
      fireEvent.change(upperThreshold, { target: { value: '100' } });
    });
  });

  it('should validate the entries', async () => {
    let renderResult = render(
      <NumericAdvancedPropertiesForm
        properties={{ min: 0, max: 10 }}
        field={field}
        onChange={onChange}
        onValidate={onValidate}
      />,
    );
    expect(screen.queryByTestId('numeric-advanced-error-min')).toBeNull();
    expect(screen.queryByTestId('numeric-advanced-error-max')).toBeNull();

    renderResult.unmount();

    renderResult = render(
      <NumericAdvancedPropertiesForm
        properties={{ min: 11, max: 10 }}
        field={field}
        onChange={onChange}
        onValidate={onValidate}
      />,
    );

    expect(renderResult.queryByTestId('numeric-advanced-error-min')).toBeNull();
    expect(renderResult.getByTestId('numeric-advanced-error-max')).toBeVisible();

    const lowerThreshold = renderResult.getByTestId('lower-threshold');
    act(() => {
      fireEvent.change(lowerThreshold, { target: { value: '10' } });
    });
    const upperThreshold = renderResult.getByTestId('upper-threshold');
    act(() => {
      fireEvent.change(upperThreshold, { target: { value: '0' } });
    });

    renderResult.rerender(
      <NumericAdvancedPropertiesForm
        properties={{ min: 10, max: 0 }}
        field={field}
        onChange={onChange}
        onValidate={onValidate}
      />,
    );

    expect(renderResult.queryByTestId('numeric-advanced-error-min')).toBeNull();
    expect(renderResult.getByTestId('numeric-advanced-error-max')).toBeVisible();
  });
});
