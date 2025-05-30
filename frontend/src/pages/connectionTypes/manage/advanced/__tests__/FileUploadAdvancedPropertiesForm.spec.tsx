import * as React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { act } from 'react';
import { ConnectionTypeFieldType, FileField } from '#~/concepts/connectionTypes/types';
import FileUploadAdvancedPropertiesForm from '#~/pages/connectionTypes/manage/advanced/FileUploadAdvancedPropertiesForm';

let onChange: jest.Mock;
let onValidate: jest.Mock;
let field: FileField;

describe('FileUploadAdvancedPropertiesForm', () => {
  beforeEach(() => {
    onChange = jest.fn();
    onValidate = jest.fn();
    field = {
      type: ConnectionTypeFieldType.File,
      name: 'Test Number',
      envVar: 'TEST_NUMBER',
      properties: {},
    };
  });

  it('should show the empty state', () => {
    render(
      <FileUploadAdvancedPropertiesForm
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
    const extensionRow = screen.getByTestId('file-upload-extension-row');
    expect(extensionRow).toBeVisible();
    // there should only be one remove button and it should be disabled
    const removeButton = screen.getByTestId('file-upload-extension-row-remove');
    expect(removeButton).toBeDisabled();

    const input = screen.getByTestId('file-upload-extension-row-input');
    act(() => {
      fireEvent.change(input, { target: { value: '.jsp' } });
    });
    expect(onChange).toHaveBeenCalledWith({ extensions: ['.jsp'] });
  });

  it('should show the given extensions', () => {
    render(
      <FileUploadAdvancedPropertiesForm
        properties={{ extensions: ['.svg', '.jpg', '.png'] }}
        field={field}
        onChange={onChange}
        onValidate={onValidate}
      />,
    );

    expect(onValidate).toHaveBeenCalledWith(true);

    // there should be 3 visible rows
    const extensionRows = screen.getAllByTestId('file-upload-extension-row');
    expect(extensionRows).toHaveLength(3);
    extensionRows.forEach((extensionRow) => expect(extensionRow).toBeVisible());

    // there should only be three remove buttons and all should be enabled
    const removeButtons = screen.getAllByTestId('file-upload-extension-row-remove');
    expect(removeButtons).toHaveLength(3);
    removeButtons.forEach((removeButton) => expect(removeButton).toBeEnabled());

    act(() => {
      removeButtons[0].click();
    });
    expect(onChange).toHaveBeenCalledWith({ extensions: ['.jpg', '.png'] });

    act(() => {
      removeButtons[1].click();
    });
    expect(onChange).toHaveBeenCalledWith({ extensions: ['.svg', '.png'] });

    act(() => {
      removeButtons[2].click();
    });
    expect(onChange).toHaveBeenCalledWith({ extensions: ['.svg', '.jpg'] });

    const addButton = screen.getByTestId('add-variable-button');
    act(() => {
      addButton.click();
    });
    expect(onChange).toHaveBeenCalledWith({ extensions: ['.svg', '.jpg', '.png', ''] });
  });

  it('should invalidate invalid extensions', () => {
    render(
      <FileUploadAdvancedPropertiesForm
        properties={{ extensions: ['bad', '.jpg', '.png'] }}
        field={field}
        onChange={onChange}
        onValidate={onValidate}
      />,
    );

    expect(onValidate).toHaveBeenCalledWith(false);
    expect(screen.getByTestId('file-upload-extension-row-error')).toBeVisible();
  });
});
