import * as React from 'react';
import FieldList, { FieldOptions } from '~/components/FieldList';
import { EnvVariableDataEntry } from './types';
import { GIT_FIELDS } from './const';

type GITFieldProps = {
  values: EnvVariableDataEntry[];
  onUpdate: (data: EnvVariableDataEntry[]) => void;
  additionalRequiredFields?: string[];
};

export const getAdditionalRequiredGITFields = (
  additionalRequiredFields?: string[],
): FieldOptions[] =>
  additionalRequiredFields
    ? GIT_FIELDS.map((field) =>
        additionalRequiredFields.includes(field.key) ? { ...field, isRequired: true } : field,
      )
    : GIT_FIELDS;

const GITField: React.FC<GITFieldProps> = ({ values, onUpdate, additionalRequiredFields }) => (
  <FieldList
    values={values}
    onUpdate={onUpdate}
    fields={getAdditionalRequiredGITFields(additionalRequiredFields)}
  />
);

export default GITField;
