import * as React from 'react';
import { EnvVariableDataEntry } from '#~/pages/projects/types';
import FieldList from '#~/components/FieldList';
import { getAdditionalRequiredAWSFields } from '#~/pages/projects/screens/spawner/spawnerUtils';

type AWSFieldProps = {
  values: EnvVariableDataEntry[];
  onUpdate: (data: EnvVariableDataEntry[]) => void;
  additionalRequiredFields?: string[];
};

const AWSField: React.FC<AWSFieldProps> = ({ values, onUpdate, additionalRequiredFields }) => (
  <FieldList
    values={values}
    onUpdate={onUpdate}
    fields={getAdditionalRequiredAWSFields(additionalRequiredFields)}
  />
);

export default AWSField;
