import { FormSection } from '@patternfly/react-core';
import * as React from 'react';
import ConnectionTypeDataFormField from '~/concepts/connectionTypes/fields/ConnectionTypeDataFormField';
import SectionFormField from '~/concepts/connectionTypes/fields/SectionFormField';
import {
  ConnectionTypeDataField,
  ConnectionTypeField,
  ConnectionTypeFieldType,
  SectionField,
} from '~/concepts/connectionTypes/types';

type Props = {
  fields?: ConnectionTypeField[];
  isPreview?: boolean;
  onChange?: (field: ConnectionTypeDataField, value: unknown) => void;
};

type FieldGroup = { section: SectionField | undefined; fields: ConnectionTypeDataField[] };

const createKey = (field: ConnectionTypeField) =>
  `${field.type}-${field.type === ConnectionTypeFieldType.Section ? field.name : field.envVar}`;

const ConnectionTypeFormFields: React.FC<Props> = ({ fields, isPreview, onChange }) => {
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

  const renderDataFields = (dataFields: ConnectionTypeDataField[]) =>
    dataFields.map((field) => (
      <ConnectionTypeDataFormField
        key={createKey(field)}
        field={field}
        isPreview={isPreview}
        onChange={onChange}
      />
    ));

  return (
    <>
      {fieldGroups?.map((fieldGroup) =>
        fieldGroup.section ? (
          <SectionFormField field={fieldGroup.section} key={createKey(fieldGroup.section)}>
            {renderDataFields(fieldGroup.fields)}
          </SectionFormField>
        ) : (
          <FormSection key="ungrouped-fields">{renderDataFields(fieldGroup.fields)}</FormSection>
        ),
      )}
    </>
  );
};

export default ConnectionTypeFormFields;
