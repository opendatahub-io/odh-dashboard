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
  parameterErrors?: Record<string, string>;
  onChange: (key: string, value: string | boolean) => void;
};

const parameterTypeToInputType = (type: CopySuiteBenchmarkParameterType): 'number' | 'text' =>
  type === 'number' ? 'number' : 'text';

const DynamicBenchmarkParameterFields: React.FC<DynamicBenchmarkParameterFieldsProps> = ({
  parameters,
  itemId,
  isDisabled = false,
  parameterConfig,
  parameterErrors,
  onChange,
}) => {
  const [interactedKeys, setInteractedKeys] = React.useState<ReadonlySet<string>>(() => new Set());

  if (parameters.length === 0) {
    return null;
  }

  const handleChange = (key: string, value: string | boolean) => {
    setInteractedKeys((prev) => {
      if (prev.has(key)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(key);
      return next;
    });
    onChange(key, value);
  };

  const sortedParameters = parameters.toSorted((left, right) => left.key.localeCompare(right.key));

  return (
    <Grid hasGutter>
      {sortedParameters.map((parameter) => {
        const fieldId = `${itemId}-parameter-${parameter.key}`;
        const value = parameter.value == null ? '' : String(parameter.value);
        const inputType = parameterTypeToInputType(parameter.type);
        const config = parameterConfig?.[parameter.key];
        const error = interactedKeys.has(parameter.key)
          ? parameterErrors?.[parameter.key]
          : undefined;

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
                    onChange={() => handleChange(parameter.key, true)}
                  />
                  <ToggleGroupItem
                    text="False"
                    buttonId={`${fieldId}-false`}
                    data-testid={`${itemId}-parameter-input-${parameter.key}-false`}
                    isSelected={parameter.value === false}
                    isDisabled={isDisabled}
                    onChange={() => handleChange(parameter.key, false)}
                  />
                </ToggleGroup>
              ) : (
                <TextInput
                  id={fieldId}
                  data-testid={`${itemId}-parameter-input-${parameter.key}`}
                  type={inputType}
                  value={value}
                  isDisabled={isDisabled}
                  validated={error ? 'error' : 'default'}
                  onChange={(_event, nextValue) => handleChange(parameter.key, nextValue)}
                />
              )}
              {error || config?.description ? (
                <FormHelperText>
                  <HelperText>
                    {error ? (
                      <HelperTextItem
                        variant="error"
                        data-testid={`${itemId}-parameter-error-${parameter.key}`}
                      >
                        {error}
                      </HelperTextItem>
                    ) : (
                      <HelperTextItem data-testid={`${itemId}-parameter-help-${parameter.key}`}>
                        {config?.description}
                      </HelperTextItem>
                    )}
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
