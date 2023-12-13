import * as React from 'react';
import { EnvVariableDataEntry } from '~/pages/projects/types';
import FieldList from '~/components/FieldList';
import { getAdditionalRequiredEdgeS3Fields } from './utils';

type EdgeS3FieldProps = {
  values: EnvVariableDataEntry[];
  onUpdate: (data: EnvVariableDataEntry[]) => void;
  additionalRequiredFields?: string[];
};

const EdgeS3Field: React.FC<EdgeS3FieldProps> = ({
  values,
  onUpdate,
  additionalRequiredFields,
}) => (
  <FieldList
    values={values}
    onUpdate={onUpdate}
    fields={getAdditionalRequiredEdgeS3Fields(additionalRequiredFields)}
  />
);

export default EdgeS3Field;
