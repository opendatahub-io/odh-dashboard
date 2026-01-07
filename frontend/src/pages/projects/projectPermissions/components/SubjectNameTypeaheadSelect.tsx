import * as React from 'react';
import TypeaheadSelect, { TypeaheadSelectOption } from '#~/components/TypeaheadSelect';

type SubjectNameTypeaheadSelectProps = {
  groupLabel: string;
  placeholder: string;
  existingNames: string[];
  value: string;
  onChange: (nextValue: string) => void;
  onClear: () => void;
  dataTestId: string;
  createOptionMessage: (newValue: string) => string;
};

const SubjectNameTypeaheadSelect: React.FC<SubjectNameTypeaheadSelectProps> = ({
  groupLabel,
  placeholder,
  existingNames,
  value,
  onChange,
  onClear,
  dataTestId,
  createOptionMessage,
}) => {
  const selectOptions: TypeaheadSelectOption[] = React.useMemo(() => {
    const base = existingNames
      .toSorted((a, b) => a.localeCompare(b))
      .map((name) => ({ content: name, value: name, group: groupLabel }));

    // Keep creatable selections visible as selected even if they don't exist in the base options.
    const trimmed = value.trim();
    if (trimmed && !base.some((o) => String(o.value).trim() === trimmed)) {
      return [...base, { content: trimmed, value: trimmed }];
    }

    return base;
  }, [existingNames, groupLabel, value]);

  return (
    <TypeaheadSelect
      selectOptions={selectOptions}
      selected={value}
      placeholder={placeholder}
      isCreatable
      isCreateOptionOnTop
      isCreateOptionExactMatchCaseSensitive
      createOptionMessage={createOptionMessage}
      onSelect={(_e, selection) => onChange(String(selection).trim())}
      onClearSelection={onClear}
      allowClear
      toggleWidth="100%"
      dataTestId={dataTestId}
      isRequired={false}
    />
  );
};

export default SubjectNameTypeaheadSelect;
