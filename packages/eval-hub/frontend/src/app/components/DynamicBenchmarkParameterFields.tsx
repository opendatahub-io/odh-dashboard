import * as React from 'react';
import {
  FormGroup,
  FormHelperText,
  Grid,
  GridItem,
  HelperText,
  HelperTextItem,
  TextInput,
  ToggleGroup,
  ToggleGroupItem,
} from '@patternfly/react-core';
import type { CuratedCollectionParameterConfig } from '~/app/curatedSuiteConfig';
import { getBenchmarkParameterLabel } from '~/app/components/benchmarkUtils';
import type {
  CopySuiteBenchmarkParameter,
  CopySuiteBenchmarkParameterType,
} from '~/app/schemas/copySuite.schema';

type DynamicBenchmarkParameterFieldsProps = {
  parameters: CopySuiteBenchmarkParameter[];
  itemId: string;
  isDisabled?: boolean;
  parameterConfig?: Record<string, CuratedCollectionParameterConfig>;
  onChange: (key: string, value: string | boolean) => void;
};

const parameterTypeToInputType = (type: CopySuiteBenchmarkParameterType): 'number' | 'text' =>
  type === 'number' ? 'number' : 'text';

const DynamicBenchmarkParameterFields: React.FC<DynamicBenchmarkParameterFieldsProps> = ({
  parameters,
  itemId,
  isDisabled = false,
  parameterConfig,
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
        const inputType = parameterTypeToInputType(parameter.type);
        const config = parameterConfig?.[parameter.key];

        return (
          <GridItem span={6} key={parameter.key}>
            <FormGroup
              label={getBenchmarkParameterLabel(parameter.key)}
              fieldId={fieldId}
              isRequired={config?.required ?? false}
            >
              {parameter.type === 'boolean' ? (
                <ToggleGroup
                  aria-label={getBenchmarkParameterLabel(parameter.key)}
                  data-testid={`${itemId}-parameter-input-${parameter.key}`}
                >
                  <ToggleGroupItem
                    text="True"
                    buttonId={`${fieldId}-true`}
                    data-testid={`${itemId}-parameter-input-${parameter.key}-true`}
                    isSelected={parameter.value === true}
                    isDisabled={isDisabled}
                    onChange={() => onChange(parameter.key, true)}
                  />
                  <ToggleGroupItem
                    text="False"
                    buttonId={`${fieldId}-false`}
                    data-testid={`${itemId}-parameter-input-${parameter.key}-false`}
                    isSelected={parameter.value === false}
                    isDisabled={isDisabled}
                    onChange={() => onChange(parameter.key, false)}
                  />
                </ToggleGroup>
              ) : (
                <TextInput
                  id={fieldId}
                  data-testid={`${itemId}-parameter-input-${parameter.key}`}
                  type={inputType}
                  value={value}
                  isDisabled={isDisabled}
                  onChange={(_event, nextValue) => onChange(parameter.key, nextValue)}
                />
              )}
              {config?.description ? (
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem data-testid={`${itemId}-parameter-help-${parameter.key}`}>
                      {config.description}
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              ) : null}
            </FormGroup>
          </GridItem>
        );
      })}
    </Grid>
  );
};

export default DynamicBenchmarkParameterFields;
