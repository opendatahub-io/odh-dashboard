import * as React from 'react';
import { Checkbox, FormGroup, HelperText, HelperTextItem } from '@patternfly/react-core';
import { ConnectionTypeDataField } from '#~/concepts/connectionTypes/types';
import ConnectionTypeDataFormField from '#~/concepts/connectionTypes/fields/ConnectionTypeDataFormField';
import DataFieldAdvancedPropertiesForm from '#~/pages/connectionTypes/manage/advanced/DataFieldAdvancedPropertiesForm';

type Props<T extends ConnectionTypeDataField> = {
  field: T;
  onChange: (properties: T['properties']) => void;
  onValidate: (isValid: boolean) => void;
};

const DataFieldPropertiesForm = <T extends ConnectionTypeDataField>({
  field,
  onChange,
  onValidate,
}: Props<T>): React.ReactNode => {
  const [defaultValueError, setDefaultValueError] = React.useState(false);
  const [advancedError, setAdvancedError] = React.useState(false);
  const isReadOnlyDisabled =
    field.properties.defaultValue === '' || field.properties.defaultValue == null;

  const hasError = defaultValueError && advancedError;
  React.useEffect(() => {
    onValidate(!hasError);
    // do not run when callback changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasError]);

  return (
    <>
      <DataFieldAdvancedPropertiesForm
        field={field}
        onChange={onChange}
        onValidate={(isValid) => setAdvancedError(!isValid)}
        properties={field.properties}
      />
      <FormGroup fieldId="defaultValue" label="Default value">
        <ConnectionTypeDataFormField
          id="defaultValue"
          field={field}
          mode="default"
          onChange={(defaultValue) => onChange({ ...field.properties, defaultValue })}
          onValidate={(error) => setDefaultValueError(!error)}
          value={field.properties.defaultValue}
          data-testid="field-default-value"
        />
        <HelperText>
          <HelperTextItem>
            Do not enter sensitive information. Default values are visible to users in your
            organization.
          </HelperTextItem>
        </HelperText>
        <Checkbox
          id="defaultReadOnly"
          label="Default value is read-only"
          isDisabled={isReadOnlyDisabled}
          isChecked={!isReadOnlyDisabled && !!field.properties.defaultReadOnly}
          onChange={(_ev, checked) => onChange({ ...field.properties, defaultReadOnly: checked })}
          data-testid="field-default-value-readonly-checkbox"
        />
      </FormGroup>
    </>
  );
};

export default DataFieldPropertiesForm;
