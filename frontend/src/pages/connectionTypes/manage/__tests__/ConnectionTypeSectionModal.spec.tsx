import * as React from 'react';
import '@testing-library/jest-dom';
import { act } from 'react';
import { fireEvent, render } from '@testing-library/react';
import ConnectionTypeSectionModal from '#~/pages/connectionTypes/manage/ConnectionTypeSectionModal';
import { ConnectionTypeFieldType } from '#~/concepts/connectionTypes/types';

describe('ConnectionTypeSectionModal', () => {
  let onClose: jest.Mock;
  let onSubmit: jest.Mock;

  beforeEach(() => {
    onClose = jest.fn();
    onSubmit = jest.fn();
  });

  it('should disable submit until valid', () => {
    const result = render(<ConnectionTypeSectionModal onClose={onClose} onSubmit={onSubmit} />);

    const nameInput = result.getByTestId('section-name');
    const descriptionInput = result.getByTestId('section-description');
    const submitButton = result.getByTestId('modal-submit-button');
    const cancelButton = result.getByTestId('modal-cancel-button');

    expect(nameInput).toHaveValue('');
    expect(descriptionInput).toHaveValue('');
    expect(submitButton).toBeDisabled();

    fireEvent.change(nameInput, { target: { value: 'test' } });

    expect(submitButton).not.toBeDisabled();

    fireEvent.click(cancelButton);

    expect(onSubmit).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalled();
  });

  it('should submit new field', () => {
    const result = render(
      <ConnectionTypeSectionModal
        onClose={onClose}
        onSubmit={onSubmit}
        field={{
          type: ConnectionTypeFieldType.Section,
          name: 'test name',
          description: 'test desc',
        }}
      />,
    );

    const nameInput = result.getByTestId('section-name');
    const descriptionInput = result.getByTestId('section-description');
    const submitButton = result.getByTestId('modal-submit-button');

    expect(nameInput).toHaveValue('test name');
    expect(descriptionInput).toHaveValue('test desc');

    fireEvent.change(nameInput, { target: { value: 'renamed' } });
    fireEvent.change(descriptionInput, { target: { value: 'updated' } });
    fireEvent.click(submitButton);

    expect(onSubmit).toHaveBeenCalledWith({
      type: ConnectionTypeFieldType.Section,
      name: 'renamed',
      description: 'updated',
    });
    expect(onClose).toHaveBeenCalled();
  });

  it('should not be able to submit until form is dirty', () => {
    const result = render(
      <ConnectionTypeSectionModal
        onClose={onClose}
        onSubmit={onSubmit}
        field={{
          type: ConnectionTypeFieldType.Section,
          name: 'test name',
          description: 'test desc',
        }}
        isEdit
      />,
    );

    const submitButton = result.getByTestId('modal-submit-button');
    const fieldNameInput = result.getByTestId('section-name');

    expect(submitButton).toBeDisabled();

    act(() => {
      fireEvent.change(fieldNameInput, { target: { value: 'new-field' } });
    });

    expect(submitButton).not.toBeDisabled();
  });
});
