import * as React from 'react';
import '@testing-library/jest-dom';
import { fireEvent, render } from '@testing-library/react';
import ConnectionTypeSectionModal from '~/pages/connectionTypes/manage/ConnectionTypeSectionModal';
import { ConnectionTypeFieldType } from '~/concepts/connectionTypes/types';

describe('ConnectionTypeSectionModal', () => {
  it('should disable submit until valid', () => {
    const closeFn = jest.fn();
    const submitFn = jest.fn();
    const result = render(
      <ConnectionTypeSectionModal isOpen onClose={closeFn} onSubmit={submitFn} />,
    );

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

    expect(submitFn).not.toHaveBeenCalled();
    expect(closeFn).toHaveBeenCalled();
  });

  it('should submit new field', () => {
    const closeFn = jest.fn();
    const submitFn = jest.fn();
    const result = render(
      <ConnectionTypeSectionModal
        isOpen
        onClose={closeFn}
        onSubmit={submitFn}
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

    expect(submitFn).toHaveBeenCalledWith({
      type: ConnectionTypeFieldType.Section,
      name: 'renamed',
      description: 'updated',
    });
    expect(closeFn).toHaveBeenCalled();
  });
});
