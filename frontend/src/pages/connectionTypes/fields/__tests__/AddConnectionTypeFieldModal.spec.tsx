import * as React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { act } from 'react-dom/test-utils';
import { ConnectionTypeDataFieldModal } from '~/pages/connectionTypes/fields/ConnectionTypeDataFieldModal';

describe('ConnectionTypeDataFieldModal', () => {
  it('should render the modal', () => {
    const onClose = jest.fn();
    const onSubmit = jest.fn();

    render(<ConnectionTypeDataFieldModal onClose={onClose} onSubmit={onSubmit} />);

    const addButton = screen.getByTestId('modal-submit-button');
    expect(addButton).toBeDisabled();
    screen.getByTestId('modal-cancel-button').click();
    expect(onClose).toHaveBeenCalled();
  });
  it('should add a short text field', () => {
    const onCancel = jest.fn();
    const onSubmit = jest.fn();

    render(<ConnectionTypeDataFieldModal onClose={onCancel} onSubmit={onSubmit} />);
    const fieldNameInput = screen.getByTestId('field-name-input');
    const fieldDescriptionInput = screen.getByTestId('field-description-input');
    const fieldEnvVarInput = screen.getByTestId('field-env-var-input');
    const fieldDefaultValueInput = screen.getByTestId('field-default-value-input');

    act(() => {
      fireEvent.change(fieldNameInput, { target: { value: 'new-field' } });
      fireEvent.change(fieldDescriptionInput, { target: { value: 'test description' } });
      fireEvent.change(fieldEnvVarInput, { target: { value: 'TEST_ENV_VAR' } });
      fireEvent.change(fieldDefaultValueInput, { target: { value: 'default value' } });
    });

    screen.getByTestId('modal-submit-button').click();

    expect(onSubmit).toHaveBeenCalledWith({
      description: 'test description',
      envVar: 'TEST_ENV_VAR',
      name: 'new-field',
      properties: {
        defaultReadOnly: undefined,
        defaultValue: 'default value',
      },
      required: undefined,
      type: 'short-text',
    });
  });
  it('should add a hidden text field', () => {
    const onClose = jest.fn();
    const onSubmit = jest.fn();

    render(<ConnectionTypeDataFieldModal onClose={onClose} onSubmit={onSubmit} />);
    const fieldNameInput = screen.getByTestId('field-name-input');
    const fieldDescriptionInput = screen.getByTestId('field-description-input');
    const fieldEnvVarInput = screen.getByTestId('field-env-var-input');
    const typeSelectGroup = screen.getByTestId('field-type-select');
    const typeSelectToggle = within(typeSelectGroup).getByRole('button');

    act(() => {
      fireEvent.change(fieldNameInput, { target: { value: 'new-field' } });
      fireEvent.change(fieldDescriptionInput, { target: { value: 'test description' } });
      fireEvent.change(fieldEnvVarInput, { target: { value: 'TEST_ENV_VAR' } });
      typeSelectToggle.click();
    });

    const hiddenSelect = within(screen.getByTestId('field-hidden-select')).getByRole('option');

    act(() => {
      hiddenSelect.click();
    });

    const fieldDefaultValueInput = screen.getByTestId('field-default-value-input');
    act(() => {
      fireEvent.change(fieldDefaultValueInput, { target: { value: 'default value' } });
    });

    screen.getByTestId('modal-submit-button').click();

    expect(onSubmit).toHaveBeenCalledWith({
      description: 'test description',
      envVar: 'TEST_ENV_VAR',
      name: 'new-field',
      properties: {
        defaultReadOnly: undefined,
        defaultValue: 'default value',
      },
      required: undefined,
      type: 'hidden',
    });
  });
});
