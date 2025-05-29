import * as React from 'react';
import FieldList from '#~/components/FieldList';
import { EnvVariableDataEntry } from '#~/pages/projects/types';
import { DATABASE_CONNECTION_FIELDS } from './const';

type DatabaseConnectionFieldProps = {
  values: EnvVariableDataEntry[];
  onUpdate: (data: EnvVariableDataEntry[]) => void;
};

const DatabaseConnectionField: React.FC<DatabaseConnectionFieldProps> = ({ values, onUpdate }) => (
  <FieldList values={values} onUpdate={onUpdate} fields={DATABASE_CONNECTION_FIELDS} />
);

export default DatabaseConnectionField;
