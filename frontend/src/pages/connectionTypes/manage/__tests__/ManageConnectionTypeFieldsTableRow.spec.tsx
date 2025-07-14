import * as React from 'react';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import ManageConnectionTypeFieldsTableRow from '#~/pages/connectionTypes/manage/ManageConnectionTypeFieldsTableRow';
import { ShortTextField, TextField } from '#~/concepts/connectionTypes/types';
import { ValidationContext, ValidationContextType } from '#~/utilities/useValidation';

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
      envVar: 'test_envvar',
      properties: {},
    };
    const field2: TextField = {
      type: 'text',
      name: 'test-2',
      envVar: 'test_envvar',
      properties: {},
    };

    const hasValidationIssueMock = jest.fn(() => false);
    const contextValue = {
      hasValidationIssue: hasValidationIssueMock,
    } as unknown as ValidationContextType;
    const result = render(renderRow({ row: field, fields: [field] }), {
      wrapper: ({ children }) => (
        <ValidationContext.Provider value={contextValue}>{children}</ValidationContext.Provider>
      ),
    });
    expect(screen.queryByLabelText(/conflict/)).not.toBeInTheDocument();

    hasValidationIssueMock.mockClear();
    hasValidationIssueMock.mockReturnValue(true);
    result.rerender(renderRow({ row: field, fields: [field, field2] }));
    expect(screen.queryByLabelText(/conflict/)).toBeInTheDocument();

    expect(hasValidationIssueMock).toHaveBeenCalledTimes(1);
    expect(hasValidationIssueMock).toHaveBeenCalledWith(['fields', 0, 'envVar'], 'envVar_conflict');
  });
});
