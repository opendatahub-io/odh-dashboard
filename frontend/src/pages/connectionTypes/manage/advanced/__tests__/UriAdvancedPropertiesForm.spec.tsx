import * as React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { act } from 'react';
import { ConnectionTypeFieldType, UriField } from '~/concepts/connectionTypes/types';
import UriAdvancedPropertiesForm from '~/pages/connectionTypes/manage/advanced/UriAdvancedPropertiesForm';

let onChange: jest.Mock;
let onValidate: jest.Mock;
let field: UriField;

describe('FileUploadAdvancedPropertiesForm', () => {
  beforeEach(() => {
    onChange = jest.fn();
    onValidate = jest.fn();
    field = {
      type: ConnectionTypeFieldType.URI,
      name: 'URI',
      envVar: 'URI',
      properties: {},
    };
  });

  it('should show the empty state', () => {
    render(
      <UriAdvancedPropertiesForm
        properties={{}}
        field={field}
        onChange={onChange}
        onValidate={onValidate}
      />,
    );

    expect(onValidate).toHaveBeenCalledWith(true);

    const advancedToggle = screen.getByTestId('advanced-settings-toggle');
    const toggleButton = within(advancedToggle).getByRole('button');

    act(() => {
      toggleButton.click();
    });

    // there should only be one row
    const schemeRow = screen.getByTestId('scheme-types-row');
    expect(schemeRow).toBeVisible();
    // there should only be one remove button and it should be disabled
    const removeButton = screen.getByTestId('scheme-types-row-remove');
    expect(removeButton).toBeDisabled();

    const input = screen.getByTestId('scheme-types-row-input');
    act(() => {
      fireEvent.change(input, { target: { value: 'https://' } });
    });
    expect(onChange).toHaveBeenCalledWith({ schemes: ['https://'] });
  });

  it('should show the given schemes', () => {
    render(
      <UriAdvancedPropertiesForm
        properties={{ schemes: ['oci://', 'one+two://', 'another:'] }}
        field={field}
        onChange={onChange}
        onValidate={onValidate}
      />,
    );

    expect(onValidate).toHaveBeenCalledWith(true);

    // there should be 3 visible rows
    const schemeRows = screen.getAllByTestId('scheme-types-row');
    expect(schemeRows).toHaveLength(3);
    schemeRows.forEach((schemeRow) => expect(schemeRow).toBeVisible());

    // there should only be three remove buttons and all should be enabled
    const removeButtons = screen.getAllByTestId('scheme-types-row-remove');
    expect(removeButtons).toHaveLength(3);
    removeButtons.forEach((removeButton) => expect(removeButton).toBeEnabled());

    act(() => {
      removeButtons[0].click();
    });
    expect(onChange).toHaveBeenCalledWith({ schemes: ['one+two://', 'another:'] });

    act(() => {
      removeButtons[1].click();
    });
    expect(onChange).toHaveBeenCalledWith({ schemes: ['oci://', 'another:'] });

    act(() => {
      removeButtons[2].click();
    });
    expect(onChange).toHaveBeenCalledWith({ schemes: ['oci://', 'one+two://'] });

    const addButton = screen.getByTestId('add-variable-button');
    act(() => {
      addButton.click();
    });
    expect(onChange).toHaveBeenCalledWith({
      schemes: ['oci://', 'one+two://', 'another:', ''],
    });
  });

  it('should invalidate invalid schemes', () => {
    render(
      <UriAdvancedPropertiesForm
        properties={{ schemes: ['1://', '][][]', 'http://'] }}
        field={field}
        onChange={onChange}
        onValidate={onValidate}
      />,
    );

    expect(onValidate).toHaveBeenCalledWith(false);
    expect(screen.getAllByTestId('scheme-types-row-error')).toHaveLength(2);
  });
});
