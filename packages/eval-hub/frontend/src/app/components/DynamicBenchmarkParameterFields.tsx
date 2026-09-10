import * as React from 'react';
import { FormGroup, Grid, GridItem, TextInput } from '@patternfly/react-core';
import type {
  CopySuiteBenchmarkParameter,
  CopySuiteBenchmarkParameterType,
} from '~/app/schemas/copySuite.schema';

type DynamicBenchmarkParameterFieldsProps = {
  parameters: CopySuiteBenchmarkParameter[];
  itemId: string;
  isDisabled?: boolean;
  onChange: (key: string, value: string) => void;
};

const parameterTypeToInputType = (type: CopySuiteBenchmarkParameterType): 'number' | 'text' =>
  type === 'number' ? 'number' : 'text';

export const getBenchmarkParameterLabel = (key: string): string => {
  const words = key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim();
  return words ? `${words.charAt(0).toUpperCase()}${words.slice(1)}` : key;
};

const DynamicBenchmarkParameterFields: React.FC<DynamicBenchmarkParameterFieldsProps> = ({
  parameters,
  itemId,
  isDisabled = false,
  onChange,
}) => {
  if (parameters.length === 0) {
    return null;
  }

  const sortedParameters = parameters.toSorted((left, right) => left.key.localeCompare(right.key));

  return (
    <Grid hasGutter>
      {sortedParameters.map((parameter) => {
        const fieldId = `${itemId}-parameter-${parameter.key}`;
        const value = parameter.value == null ? '' : String(parameter.value);

        return (
          <GridItem span={6} key={parameter.key}>
            <FormGroup label={getBenchmarkParameterLabel(parameter.key)} fieldId={fieldId}>
              <TextInput
                id={fieldId}
                data-testid={`${itemId}-parameter-input-${parameter.key}`}
                type={parameterTypeToInputType(parameter.type)}
                value={value}
                isDisabled={isDisabled}
                onChange={(_event, nextValue) => onChange(parameter.key, nextValue)}
              />
            </FormGroup>
          </GridItem>
        );
      })}
    </Grid>
  );
};

export default DynamicBenchmarkParameterFields;
