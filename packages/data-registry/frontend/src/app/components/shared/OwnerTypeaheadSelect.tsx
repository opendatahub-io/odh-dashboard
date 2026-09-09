import React from 'react';
import { TypeaheadSelect } from '@patternfly/react-templates';
import { useSettings } from 'mod-arch-core';

const UNASSIGNED = 'Unassigned';

type OwnerTypeaheadSelectProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  'data-testid'?: string;
};

const OwnerTypeaheadSelect: React.FC<OwnerTypeaheadSelectProps> = ({
  id,
  value,
  onChange,
  'data-testid': dataTestId,
}) => {
  const { userSettings } = useSettings();
  const userId = typeof userSettings?.userId === 'string' ? userSettings.userId : '';

  const ownerOptions = React.useMemo(() => {
    const options = [{ content: UNASSIGNED, value: UNASSIGNED, selected: value === UNASSIGNED }];
    if (userId) {
      options.unshift({ content: userId, value: userId, selected: value === userId });
    }
    if (value && value !== userId && value !== UNASSIGNED) {
      options.push({ content: value, value, selected: true });
    }
    return options;
  }, [userId, value]);

  return (
    <TypeaheadSelect
      key={userId}
      id={id}
      placeholder="Select or type owner"
      initialOptions={ownerOptions}
      onSelect={(_event, selectedValue) => {
        onChange(String(selectedValue));
      }}
      onClearSelection={() => onChange('')}
      isCreatable
      createOptionMessage={(newValue) => `Use "${newValue}"`}
      toggleWidth="100%"
      data-testid={dataTestId}
    />
  );
};

export default OwnerTypeaheadSelect;
