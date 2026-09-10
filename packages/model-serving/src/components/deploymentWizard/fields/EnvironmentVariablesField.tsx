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
  createDefaultEnvironmentVariable,
  EnvironmentVariableType,
  isEnvironmentVariableType,
  isValidSecretDataKey,
  isValidSecretName,
  normalizeEnvironmentVariable,
  SECRET_DATA_KEY_VALIDATION_ERROR,
  SECRET_NAME_VALIDATION_ERROR,
  type EnvironmentVariable,
} from '../../../shared/environmentVariablesUtils';

const envVarNameSchema = z
  .string()
  .regex(
    /^[A-Za-z_][A-Za-z0-9_]*$/,
    'Environment variable name must start with a letter or underscore and contain only letters, numbers, and underscores',
  );

const valueEnvVarSchema = z.object({
  type: z.literal(EnvironmentVariableType.Value),
  name: envVarNameSchema,
  value: z.string(),
});

const secretEnvVarSchema = z.object({
  type: z.literal(EnvironmentVariableType.Secret),
  name: envVarNameSchema,
  secretName: z
    .string()
    .min(1, 'Secret name is required')
    .refine(isValidSecretName, SECRET_NAME_VALIDATION_ERROR),
  secretKey: z
    .string()
    .min(1, 'Secret key is required')
    .refine(isValidSecretDataKey, SECRET_DATA_KEY_VALIDATION_ERROR),
  optional: z.boolean().optional(),
});

const enabledEnvVarSchema = z.discriminatedUnion('type', [valueEnvVarSchema, secretEnvVarSchema]);

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

const isEnvironmentVariableComplete = (envVar: EnvironmentVariable): boolean => {
  if (envVar.name.trim() === '' || isValidEnvironmentVariables(envVar.name) !== '') {
    return false;
  }

  if (envVar.type === EnvironmentVariableType.Secret) {
    return (
      envVar.secretName.trim() !== '' &&
      envVar.secretKey.trim() !== '' &&
      isValidSecretName(envVar.secretName) &&
      isValidSecretDataKey(envVar.secretKey)
    );
  }

  return true;
};

export const hasInvalidEnvironmentVariableNames = (
  data?: EnvironmentVariablesFieldData,
): boolean => {
  if (!data?.enabled) {
    return false;
  }

  return data.variables.some((variable) => !isEnvironmentVariableComplete(variable));
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

type EnvironmentVariableUpdates = {
  type?: EnvironmentVariableType;
  name?: string;
  value?: string;
  secretName?: string;
  secretKey?: string;
  optional?: boolean;
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

  const validateEnvVarName = (name: string): string => {
    return isValidEnvironmentVariables(name);
  };

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
    const nextType = updates.type ?? currentVar.type;

    const updatedVar: EnvironmentVariable =
      nextType === EnvironmentVariableType.Secret
        ? {
            type: EnvironmentVariableType.Secret,
            name: updates.name ?? currentVar.name,
            secretName:
              updates.secretName ??
              (currentVar.type === EnvironmentVariableType.Secret ? currentVar.secretName : ''),
            secretKey:
              updates.secretKey ??
              (currentVar.type === EnvironmentVariableType.Secret ? currentVar.secretKey : ''),
            ...(currentVar.type === EnvironmentVariableType.Secret && currentVar.optional
              ? { optional: true }
              : {}),
          }
        : {
            type: EnvironmentVariableType.Value,
            name: updates.name ?? currentVar.name,
            value:
              updates.value ??
              (currentVar.type === EnvironmentVariableType.Value ? currentVar.value : ''),
          };

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
              const nameError = validateEnvVarName(normalizedEnvVar.name);
              const secretNameError =
                normalizedEnvVar.type === EnvironmentVariableType.Secret
                  ? normalizedEnvVar.secretName.trim() === ''
                    ? 'Secret name is required'
                    : isValidSecretName(normalizedEnvVar.secretName)
                    ? ''
                    : SECRET_NAME_VALIDATION_ERROR
                  : '';
              const secretKeyError =
                normalizedEnvVar.type === EnvironmentVariableType.Secret
                  ? normalizedEnvVar.secretKey.trim() === ''
                    ? 'Secret key is required'
                    : isValidSecretDataKey(normalizedEnvVar.secretKey)
                    ? ''
                    : SECRET_DATA_KEY_VALIDATION_ERROR
                  : '';

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
