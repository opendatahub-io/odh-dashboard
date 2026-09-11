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
  ValidatedOptions,
} from '@patternfly/react-core';
import {
  ExclamationCircleIcon,
  MinusCircleIcon,
  OutlinedQuestionCircleIcon,
  PlusCircleIcon,
} from '@patternfly/react-icons';
import SimpleSelect, {
  type SimpleSelectOption,
} from '@odh-dashboard/ui-core/components/SimpleSelect';
import { z } from 'zod';
import {
  enabledEnvVarSchema,
  envVarNameSchema,
  getEnvironmentVariableFieldErrors,
  isCompleteEnvironmentVariable,
} from '../../../shared/environmentVariablesSchema';
import {
  createDefaultEnvironmentVariable,
  EnvironmentVariableType,
  isEnvironmentVariableType,
  mergeEnvironmentVariableUpdates,
  normalizeEnvironmentVariable,
  type EnvironmentVariableUpdates,
} from '../../../shared/environmentVariablesUtils';

const disabledEnvVarSchema = z.object({
  type: z.nativeEnum(EnvironmentVariableType).optional(),
  name: z.string(),
  value: z.string().optional(),
  secretName: z.string().optional(),
  secretKey: z.string().optional(),
  optional: z.boolean().optional(),
});

export const environmentVariablesFieldSchema = z.discriminatedUnion('enabled', [
  z.object({
    enabled: z.literal(true),
    variables: z.array(enabledEnvVarSchema),
  }),
  z.object({
    enabled: z.literal(false),
    variables: z.array(disabledEnvVarSchema),
  }),
]);

export type EnvironmentVariablesFieldData = z.infer<typeof environmentVariablesFieldSchema>;

const envVarTypeOptions: SimpleSelectOption[] = [
  { key: EnvironmentVariableType.Value, label: 'Value' },
  { key: EnvironmentVariableType.Secret, label: 'Secret' },
];

export const isValidEnvironmentVariables = (name: string): string => {
  if (name.length === 0) {
    return '';
  }
  const result = envVarNameSchema.safeParse(name);
  return result.success ? '' : result.error.errors[0]?.message || '';
};

export const hasInvalidEnvironmentVariableNames = (
  data?: EnvironmentVariablesFieldData,
): boolean => {
  if (!data?.enabled) {
    return false;
  }

  return data.variables.some((variable) => !isCompleteEnvironmentVariable(variable));
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
  allowCreate = true,
  predefinedVars,
}) => {
  const lastNameFieldRef = React.useRef<HTMLInputElement>(null);
  const addVarButtonRef = React.useRef<HTMLButtonElement>(null);

  const addEnvVar = () => {
    if (data.enabled) {
      onChange?.({
        enabled: true,
        variables: [
          ...data.variables.map(normalizeEnvironmentVariable),
          createDefaultEnvironmentVariable(),
        ],
      });
    } else {
      onChange?.({ enabled: true, variables: [createDefaultEnvironmentVariable()] });
    }
    requestAnimationFrame(() => {
      lastNameFieldRef.current?.focus();
    });
  };

  const removeEnvVar = (indexToRemove: number) => {
    const newVars = data.variables.filter((_, i) => i !== indexToRemove);
    if (data.enabled) {
      onChange?.({
        enabled: true,
        variables: newVars.map(normalizeEnvironmentVariable),
      });
    } else {
      onChange?.({ enabled: false, variables: newVars });
    }
  };

  const updateEnvVar = (index: number, updates: EnvironmentVariableUpdates) => {
    if (!data.enabled) {
      return;
    }

    const currentVar = normalizeEnvironmentVariable(data.variables[index]);
    const updatedVar = mergeEnvironmentVariableUpdates(currentVar, updates);
    const newVars = data.variables.map(normalizeEnvironmentVariable);
    newVars[index] = updatedVar;
    onChange?.({ enabled: true, variables: newVars });
  };

  const handleCheckboxChange = (_event: React.FormEvent<HTMLInputElement>, checked: boolean) => {
    if (checked) {
      onChange?.({
        enabled: true,
        variables: data.variables.map(normalizeEnvironmentVariable),
      });
      return;
    }

    onChange?.({ enabled: false, variables: data.variables });
  };

  return (
    <Stack hasGutter>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Checkbox
            id="env-vars-checkbox"
            label="Add custom runtime environment variables"
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
        <Popover
          headerContent="Predefined variables of the selected serving runtime"
          bodyContent={
            <List isPlain data-testid="predefined-vars-list">
              {!predefinedVars || predefinedVars.length === 0 ? (
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
      </div>

      {data.enabled && (
        <Stack>
          <Stack hasGutter>
            {data.variables.map((envVar, index) => {
              const normalizedEnvVar = normalizeEnvironmentVariable(envVar);
              const { nameError, secretNameError, secretKeyError } =
                getEnvironmentVariableFieldErrors(normalizedEnvVar);

              return (
                <Split hasGutter key={index}>
                  <SplitItem>
                    <SimpleSelect
                      dataTestId={`env-var-type-${index}`}
                      ariaLabel="env var type"
                      options={envVarTypeOptions}
                      value={normalizedEnvVar.type}
                      onChange={(key) => {
                        if (isEnvironmentVariableType(key)) {
                          updateEnvVar(index, { type: key });
                        }
                      }}
                      isDisabled={!allowCreate}
                    />
                  </SplitItem>
                  <SplitItem isFilled>
                    <TextInput
                      data-testid={`env-var-name-${index}`}
                      aria-label="env var name"
                      value={normalizedEnvVar.name}
                      onChange={(_event, value) => updateEnvVar(index, { name: value })}
                      ref={index === data.variables.length - 1 ? lastNameFieldRef : undefined}
                      validated={nameError ? ValidatedOptions.error : ValidatedOptions.default}
                    />
                    {nameError && (
                      <FormHelperText>
                        <HelperText>
                          <HelperTextItem variant="error" icon={<ExclamationCircleIcon />}>
                            {nameError}
                          </HelperTextItem>
                        </HelperText>
                      </FormHelperText>
                    )}
                  </SplitItem>
                  {normalizedEnvVar.type === EnvironmentVariableType.Value ? (
                    <SplitItem isFilled>
                      <TextInput
                        data-testid={`env-var-value-${index}`}
                        aria-label="env var value"
                        value={normalizedEnvVar.value}
                        onChange={(_event, value) => updateEnvVar(index, { value })}
                      />
                    </SplitItem>
                  ) : (
                    <>
                      <SplitItem isFilled>
                        <TextInput
                          data-testid={`env-var-secret-name-${index}`}
                          aria-label="env var secret name"
                          value={normalizedEnvVar.secretName}
                          onChange={(_event, value) => updateEnvVar(index, { secretName: value })}
                          validated={
                            secretNameError ? ValidatedOptions.error : ValidatedOptions.default
                          }
                        />
                        {secretNameError && (
                          <FormHelperText>
                            <HelperText>
                              <HelperTextItem variant="error" icon={<ExclamationCircleIcon />}>
                                {secretNameError}
                              </HelperTextItem>
                            </HelperText>
                          </FormHelperText>
                        )}
                      </SplitItem>
                      <SplitItem isFilled>
                        <TextInput
                          data-testid={`env-var-secret-key-${index}`}
                          aria-label="env var secret key"
                          value={normalizedEnvVar.secretKey}
                          onChange={(_event, value) => updateEnvVar(index, { secretKey: value })}
                          validated={
                            secretKeyError ? ValidatedOptions.error : ValidatedOptions.default
                          }
                        />
                        {secretKeyError && (
                          <FormHelperText>
                            <HelperText>
                              <HelperTextItem variant="error" icon={<ExclamationCircleIcon />}>
                                {secretKeyError}
                              </HelperTextItem>
                            </HelperText>
                          </FormHelperText>
                        )}
                      </SplitItem>
                    </>
                  )}
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
