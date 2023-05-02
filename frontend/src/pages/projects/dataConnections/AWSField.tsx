import * as React from 'react';
import { EnvVariableDataEntry } from '~/pages/projects/types';
import FieldList from '~/components/FieldList';
import { AWS_FIELDS } from './const';

type AWSFieldProps = {
  values: EnvVariableDataEntry[];
  onUpdate: (data: EnvVariableDataEntry[]) => void;
};

const AWSField: React.FC<AWSFieldProps> = ({ values, onUpdate }) => (
  <FieldList values={values} onUpdate={onUpdate} fields={AWS_FIELDS} />
);

export default AWSField;
