import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { ConnectionTypeField, SectionField } from '#~/concepts/connectionTypes/types';
import ConnectionTypeSectionRemoveModal from '#~/pages/connectionTypes/manage/ConnectionTypeSectionRemoveModal';

describe('ConnectionTypeSectionRemoveModal', () => {
  it('should callback on submit ', () => {
    const onClose = jest.fn();
    const section: SectionField = {
      type: 'section',
      name: 'test name',
      description: 'test desc',
    };
    render(<ConnectionTypeSectionRemoveModal field={section} fields={[]} onClose={onClose} />);

    screen.getByTestId('modal-submit-button').click();
    expect(onClose).toHaveBeenCalledWith(true, false);
  });

  it('should callback on submit to also remove fields', () => {
    const onClose = jest.fn();
    const section: SectionField = {
      type: 'section',
      name: 'test name',
      description: 'test desc',
    };
    const fields: ConnectionTypeField[] = [
      { type: 'short-text', name: 'test field', envVar: 'TEST_FIELD', properties: {} },
    ];
    render(<ConnectionTypeSectionRemoveModal field={section} fields={fields} onClose={onClose} />);

    React.act(() => {
      screen.getByTestId('remove-fields-checkbox').click();
    });
    screen.getByTestId('modal-submit-button').click();
    expect(onClose).toHaveBeenCalledWith(true, true);
  });
});
