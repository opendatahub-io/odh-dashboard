import React from 'react';
import {
  Button,
  Checkbox,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Icon,
  List,
  ListItem,
  Popover,
  Split,
  SplitItem,
  Stack,
  TextInput,
  Tooltip,
  ValidatedOptions,
} from '@patternfly/react-core';
import {
  ExclamationCircleIcon,
  MinusCircleIcon,
  OutlinedQuestionCircleIcon,
  PlusCircleIcon,
} from '@patternfly/react-icons';
import { z } from 'zod';

// Schema
const envVarSchema = z.object({
  name: z
    .string()
    .regex(
      /^[A-Za-z_][A-Za-z0-9_]*$/,
      'Environment variable name must start with a letter or underscore and contain only letters, numbers, and underscores',
    ),
  value: z.string(),
});

export const environmentVariablesFieldSchema = z.object({
  enabled: z.boolean(),
  variables: z.array(envVarSchema),
});

export type EnvironmentVariablesFieldData = z.infer<typeof environmentVariablesFieldSchema>;

export const isValidEnvironmentVariables = (name: string): string => {
  if (name.length === 0) {
    return '';
  }
  const result = envVarSchema.shape.name.safeParse(name);
  return result.success ? '' : result.error.errors[0]?.message || '';
};

// Hook
export type EnvironmentVariablesFieldHook = {
  data: EnvironmentVariablesFieldData | undefined;
  setData: (data: EnvironmentVariablesFieldData) => void;
};

export const useEnvironmentVariablesField = (
  existingData?: EnvironmentVariablesFieldData,
): EnvironmentVariablesFieldHook => {
  const [envVarsData, setEnvVarsData] = React.useState<EnvironmentVariablesFieldData | undefined>(
    existingData || { enabled: false, variables: [] },
  );

  return {
    data: envVarsData,
    setData: setEnvVarsData,
  };
};

// Component
type EnvironmentVariablesFieldProps = {
  data?: EnvironmentVariablesFieldData;
  onChange?: (data: EnvironmentVariablesFieldData) => void;
  allowCreate?: boolean;
  predefinedVars?: string[];
};

export const EnvironmentVariablesField: React.FC<EnvironmentVariablesFieldProps> = ({
  data = { enabled: false, variables: [] },
  onChange,
  allowCreate = false,
  predefinedVars,
}) => {
  const lastNameFieldRef = React.useRef<HTMLInputElement>(null);
  const addVarButtonRef = React.useRef<HTMLButtonElement>(null);

  const validateEnvVarName = (name: string): string => {
    return isValidEnvironmentVariables(name);
  };

  const addEnvVar = () => {
    const newVars = [...data.variables, { name: '', value: '' }];
    const newData = { ...data, variables: newVars };
    onChange?.(newData);
    requestAnimationFrame(() => {
      lastNameFieldRef.current?.focus();
    });
  };

  const removeEnvVar = (indexToRemove: number) => {
    const newVars = data.variables.filter((_, i) => i !== indexToRemove);
    const newData = { ...data, variables: newVars };
    onChange?.(newData);
  };

  const updateEnvVar = (index: number, updates: { name?: string; value?: string }) => {
    const newVars = [...data.variables];
    const updatedVar = { ...newVars[index], ...updates };
    newVars[index] = updatedVar;
    const newData = { ...data, variables: newVars };
    onChange?.(newData);
  };

  const handleCheckboxChange = (event: React.FormEvent<HTMLInputElement>, checked: boolean) => {
    const newData = { ...data, enabled: checked };
    onChange?.(newData);
  };

  return (
    <Stack hasGutter>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Checkbox
            id="env-vars-checkbox"
            label="Apply additional serving runtime environment variables"
            isChecked={data.enabled}
            isDisabled={!allowCreate}
            onChange={handleCheckboxChange}
            data-testid="env-vars-checkbox"
          />
          <Popover
            bodyContent={
              <div>
                Environment variables can be predefined by the selected serving runtime. Overwriting
                predefined variables only affects this model deployment.
              </div>
            }
          >
            <Icon aria-label="Additional environment variables info" role="button">
              <OutlinedQuestionCircleIcon />
            </Icon>
          </Popover>
        </div>
        {!predefinedVars ? (
          <Tooltip
            data-testid="predefined-vars-tooltip"
            content={
              <div>Select a serving runtime to view its predefined environment variables.</div>
            }
          >
            <Button
              isInline
              data-testid="view-predefined-vars-button"
              variant="link"
              isAriaDisabled={!predefinedVars}
            >
              View predefined variables
            </Button>
          </Tooltip>
        ) : (
          <Popover
            headerContent="Predefined variables of the selected serving runtime"
            bodyContent={
              <List isPlain data-testid="predefined-vars-list">
                {!predefinedVars.length ? (
                  <ListItem key="0">No predefined variables</ListItem>
                ) : (
                  predefinedVars.map((arg: string, index: number) => (
                    <ListItem key={index}>{arg}</ListItem>
                  ))
                )}
              </List>
            }
            footerContent={
              <div>
                To <strong>overwrite</strong> a predefined variable, specify a new value in the{' '}
                <strong>Additional environment variables</strong> field.
              </div>
            }
          >
            <Button
              isInline
              data-testid="view-predefined-vars-button"
              variant="link"
              isAriaDisabled={!predefinedVars}
            >
              View predefined variables
            </Button>
          </Popover>
        )}
      </div>

      {data.enabled && (
        <Stack>
          <Stack hasGutter>
            {data.variables.map((envVar, index) => {
              const error = validateEnvVarName(envVar.name);
              return (
                <Split hasGutter key={index}>
                  <SplitItem isFilled>
                    <TextInput
                      data-testid={`env-var-name-${index}`}
                      aria-label="env var name"
                      value={envVar.name}
                      onChange={(_event, value) => updateEnvVar(index, { name: value })}
                      ref={index === data.variables.length - 1 ? lastNameFieldRef : undefined}
                      validated={error ? ValidatedOptions.error : ValidatedOptions.default}
                    />
                    {error && (
                      <FormHelperText>
                        <HelperText>
                          <HelperTextItem variant="error" icon={<ExclamationCircleIcon />}>
                            {error}
                          </HelperTextItem>
                        </HelperText>
                      </FormHelperText>
                    )}
                  </SplitItem>
                  <SplitItem isFilled>
                    <TextInput
                      data-testid={`env-var-value-${index}`}
                      aria-label="env var value"
                      value={envVar.value}
                      onChange={(_event, value) => updateEnvVar(index, { value })}
                    />
                  </SplitItem>
                  <SplitItem>
                    <Button
                      aria-label="remove-environment-variable"
                      onClick={() => removeEnvVar(index)}
                      variant="plain"
                      icon={<MinusCircleIcon />}
                      isDisabled={!allowCreate}
                    />
                  </SplitItem>
                </Split>
              );
            })}
            <Button
              isInline
              data-testid="add-environment-variable"
              variant="link"
              onClick={addEnvVar}
              icon={<PlusCircleIcon />}
              ref={addVarButtonRef}
              isDisabled={!allowCreate}
            >
              Add variable
            </Button>
          </Stack>
        </Stack>
      )}
    </Stack>
  );
};
