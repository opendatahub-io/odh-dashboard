import * as React from 'react';
import { Checkbox, FormGroup, TextInput, ValidatedOptions } from '@patternfly/react-core';
import { ConnectionTypeCommonProperties } from '~/concepts/connectionTypes/types';

type TextFormProps = {
  properties: ConnectionTypeCommonProperties;
  onChange: (newProperties: ConnectionTypeCommonProperties) => void;
  validate: (value: string) => ValidatedOptions;
};

export const TextForm: React.FC<TextFormProps> = ({ properties, onChange, validate }) => (
  <>
    <FormGroup fieldId="defaultValue" label="Default value">
      <TextInput
        id="defaultValue"
        value={properties.defaultValue || ''}
        onChange={(_ev, value) =>
          onChange({ defaultValue: value, defaultReadOnly: properties.defaultReadOnly })
        }
        validated={
          properties.defaultValue ? validate(properties.defaultValue) : ValidatedOptions.default
        }
        data-testid="field-default-value-input"
      />
      <Checkbox
        id="defaultReadOnly"
        label="Default value is read-only"
        isDisabled={!properties.defaultValue}
        isChecked={(properties.defaultValue && properties.defaultReadOnly) || false}
        onChange={(_ev, checked) =>
          onChange({ defaultValue: properties.defaultValue, defaultReadOnly: checked })
        }
        data-testid="field-default-value-readonly-checkbox"
      />
    </FormGroup>
  </>
);
