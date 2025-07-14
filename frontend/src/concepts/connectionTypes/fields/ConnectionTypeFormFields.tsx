import * as React from 'react';
import ConnectionTypeDataFormField from '#~/concepts/connectionTypes/fields/ConnectionTypeDataFormField';
import DataFormFieldGroup from '#~/concepts/connectionTypes/fields/DataFormFieldGroup';
import SectionFormField from '#~/concepts/connectionTypes/fields/SectionFormField';
import {
  ConnectionTypeDataField,
  ConnectionTypeField,
  ConnectionTypeFieldType,
  ConnectionTypeValueType,
  SectionField,
} from '#~/concepts/connectionTypes/types';
import { isConnectionTypeDataField } from '#~/concepts/connectionTypes/utils';

type Props = {
  fields?: ConnectionTypeField[];
  isPreview?: boolean;
  onChange?: (field: ConnectionTypeDataField, value: ConnectionTypeValueType) => void;
  connectionValues?: {
    [key: string]: ConnectionTypeValueType;
  };
  onValidate?: (
    field: ConnectionTypeDataField,
    error: boolean | string,
    value?: ConnectionTypeValueType,
  ) => void;
  connectionErrors?: {
    [key: string]: boolean | string;
  };
};

type FieldGroup = {
  section: SectionField | undefined;
  fields: ConnectionTypeDataField[];
};

const ConnectionTypeFormFields: React.FC<Props> = ({
  fields,
  isPreview,
  onChange,
  connectionValues,
  onValidate,
  connectionErrors,
}) => {
  const fieldGroups = React.useMemo(
    () =>
      fields?.reduce<FieldGroup[]>((acc, field) => {
        if (field.type === ConnectionTypeFieldType.Section) {
          acc.push({ section: field, fields: [] });
        } else if (acc.length === 0) {
          acc.push({ section: undefined, fields: [field] });
        } else {
          acc[acc.length - 1].fields.push(field);
        }
        return acc;
      }, []),
    [fields],
  );

  const unmatchedValues: ConnectionTypeDataField[] = React.useMemo(() => {
    const unmatched: ConnectionTypeDataField[] = [];
    for (const key in connectionValues) {
      const matching = fields?.find((f) => isConnectionTypeDataField(f) && f.envVar === key);
      if (!matching) {
        unmatched.push({
          type: ConnectionTypeFieldType.ShortText,
          envVar: key,
          name: key,
          properties: {},
        });
      }
    }
    return unmatched;
  }, [connectionValues, fields]);

  const renderDataFields = (dataFields: ConnectionTypeDataField[]) =>
    dataFields.map((field, i) => {
      const id = `field-${field.envVar}`;
      return (
        <DataFormFieldGroup key={i} field={field} id={id}>
          <ConnectionTypeDataFormField
            id={id}
            field={field}
            mode={isPreview ? 'preview' : 'instance'}
            onChange={onChange ? (v) => onChange(field, v) : undefined}
            value={connectionValues?.[field.envVar]}
            onValidate={(error, value) => onValidate?.(field, error, value)}
            error={connectionErrors?.[field.envVar]}
            data-testid={`field ${field.envVar}`}
          />
        </DataFormFieldGroup>
      );
    });

  return (
    <>
      {fieldGroups?.map((fieldGroup, i) =>
        fieldGroup.section ? (
          <SectionFormField field={fieldGroup.section} key={i} data-testid="fields-section">
            {renderDataFields(fieldGroup.fields)}
          </SectionFormField>
        ) : (
          <React.Fragment key={i}>{renderDataFields(fieldGroup.fields)}</React.Fragment>
        ),
      )}
      {unmatchedValues.length > 0 && renderDataFields(unmatchedValues)}
    </>
  );
};

export default React.memo(ConnectionTypeFormFields);
