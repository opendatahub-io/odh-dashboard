import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import ManageConnectionTypeFieldsTableRow from '~/pages/connectionTypes/manage/ManageConnectionTypeFieldsTableRow';
import { ShortTextField, TextField } from '~/concepts/connectionTypes/types';

const renderRow = (
  props: Pick<React.ComponentProps<typeof ManageConnectionTypeFieldsTableRow>, 'row'> &
    Partial<React.ComponentProps<typeof ManageConnectionTypeFieldsTableRow>>,
) => {
  const fn = jest.fn();
  return (
    <table>
      <tbody>
        <ManageConnectionTypeFieldsTableRow
          fields={[]}
          onAddField={fn}
          onChange={fn}
          onRemove={fn}
          onDragEnd={fn}
          onDragStart={fn}
          onDrop={fn}
          onDuplicate={fn}
          onEdit={fn}
          onMoveToSection={fn}
          id="test"
          rowIndex={0}
          {...props}
        />
      </tbody>
    </table>
  );
};

describe('ManageConnectionTypeFieldsTableRow', () => {
  it('should display env variable conflict icon', () => {
    const field: ShortTextField = {
      type: 'short-text',
      name: 'test',
      envVar: 'test-envvar',
      properties: {},
    };
    const field2: TextField = {
      type: 'text',
      name: 'test-2',
      envVar: 'test-envvar',
      properties: {},
    };

    const result = render(renderRow({ row: field, fields: [field] }));
    expect(screen.getByTestId('field-env')).not.toHaveTextContent('conflict');

    result.rerender(renderRow({ row: field, fields: [field, field2] }));
    expect(screen.getByTestId('field-env')).toHaveTextContent('conflict');
  });
});
