import * as React from 'react';
import { render } from '@testing-library/react';
import SubjectNameTypeaheadSelect from '#~/pages/projects/projectPermissions/components/SubjectNameTypeaheadSelect';

const mockTypeaheadSelect = jest.fn((props: unknown) => {
  void props;
  return null;
});

jest.mock('#~/components/TypeaheadSelect', () => ({
  __esModule: true,
  default: (props: unknown) => mockTypeaheadSelect(props),
}));

describe('SubjectNameTypeaheadSelect', () => {
  beforeEach(() => {
    mockTypeaheadSelect.mockClear();
  });

  const getLastTypeaheadProps = (): Record<string, unknown> => {
    expect(mockTypeaheadSelect).toHaveBeenCalled();
    const call = mockTypeaheadSelect.mock.calls.at(0);
    if (!call) {
      throw new Error('Expected TypeaheadSelect to be called');
    }
    const props = call[0];
    expect(props).toBeDefined();
    return props as unknown as Record<string, unknown>;
  };

  it('passes stable props to TypeaheadSelect (creatable + create option on top + case-sensitive exact match)', () => {
    render(
      <SubjectNameTypeaheadSelect
        groupLabel="Users with existing assignment"
        placeholder="Select a user"
        existingNames={['test-user']}
        value=""
        onChange={() => undefined}
        onClear={() => undefined}
        dataTestId="subject-typeahead"
        createOptionMessage={(v) => `Assign role to "${v}"`}
      />,
    );

    expect(mockTypeaheadSelect).toHaveBeenCalledTimes(1);
    const props = getLastTypeaheadProps();
    expect(props.isCreatable).toBe(true);
    expect(props.isCreateOptionOnTop).toBe(true);
    expect(props.isCreateOptionExactMatchCaseSensitive).toBe(true);
  });

  it('sorts existing names and groups them', () => {
    render(
      <SubjectNameTypeaheadSelect
        groupLabel="Users with existing assignment"
        placeholder="Select a user"
        existingNames={['b-user', 'a-user']}
        value=""
        onChange={() => undefined}
        onClear={() => undefined}
        dataTestId="subject-typeahead"
        createOptionMessage={(v) => `Assign role to "${v}"`}
      />,
    );

    const props = getLastTypeaheadProps();
    const selectOptions = props.selectOptions as Array<{
      content: string;
      value: string;
      group?: string;
    }>;

    expect(selectOptions.map((o) => o.value)).toEqual(['a-user', 'b-user']);
    expect(selectOptions.every((o) => o.group === 'Users with existing assignment')).toBe(true);
  });

  it('injects a creatable value into selectOptions when it does not exactly match an existing name (case-sensitive)', () => {
    render(
      <SubjectNameTypeaheadSelect
        groupLabel="Users with existing assignment"
        placeholder="Select a user"
        existingNames={['test-user']}
        value="Test-user"
        onChange={() => undefined}
        onClear={() => undefined}
        dataTestId="subject-typeahead"
        createOptionMessage={(v) => `Assign role to "${v}"`}
      />,
    );

    const props = getLastTypeaheadProps();
    const selectOptions = props.selectOptions as Array<{
      content: string;
      value: string;
      group?: string;
    }>;

    // Existing base option should remain grouped
    expect(selectOptions[0]).toMatchObject({
      value: 'test-user',
      group: 'Users with existing assignment',
    });
    // Typed value should be appended without group to ensure it can still be selected
    expect(selectOptions.some((o) => o.value === 'Test-user' && !o.group)).toBe(true);
  });

  it('does not inject a duplicate when value exactly matches an existing name (case-sensitive)', () => {
    render(
      <SubjectNameTypeaheadSelect
        groupLabel="Users with existing assignment"
        placeholder="Select a user"
        existingNames={['test-user']}
        value="test-user"
        onChange={() => undefined}
        onClear={() => undefined}
        dataTestId="subject-typeahead"
        createOptionMessage={(v) => `Assign role to "${v}"`}
      />,
    );

    const props = getLastTypeaheadProps();
    const selectOptions = props.selectOptions as Array<{ value: string }>;
    expect(selectOptions.filter((o) => o.value === 'test-user')).toHaveLength(1);
  });
});
