import { FormGroup, TextInput } from '@patternfly/react-core';
import * as React from 'react';
import { BooleanField } from '#~/concepts/connectionTypes/types';
import { AdvancedFieldProps } from '#~/pages/connectionTypes/manage/advanced/types';

const BooleanAdvancedPropertiesForm: React.FC<AdvancedFieldProps<BooleanField>> = ({
  properties,
  onChange,
  onValidate,
}) => {
  React.useEffect(() => {
    onValidate(!!properties.label);
    // do not run when callback changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties.label]);

  return (
    <FormGroup label="Checkbox label" isRequired fieldId="checkbox-label">
      <TextInput
        autoComplete="off"
        isRequired
        id="checkbox-label"
        name="checkbox-label"
        data-testid="checkbox-label"
        value={properties.label ?? ''}
        onChange={(e, value) => onChange({ ...properties, label: value })}
      />
    </FormGroup>
  );
};

export default BooleanAdvancedPropertiesForm;
