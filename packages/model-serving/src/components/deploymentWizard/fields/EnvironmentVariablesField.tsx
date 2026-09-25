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
  StackItem,
  TextInput,
} from '@patternfly/react-core';
import SimpleSelect, {
  type SimpleSelectOption,
} from '@odh-dashboard/ui-core/components/SimpleSelect';
import {
  ExclamationCircleIcon,
  MinusCircleIcon,
  OutlinedQuestionCircleIcon,
  PlusCircleIcon,
} from '@patternfly/react-icons';
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
  type EnvironmentVariable,
  type EnvironmentVariableUpdates,
} from '../../../shared/environmentVariablesUtils';

type EnvVarFieldErrorProps = {
  error?: string;
  errorId?: string;
};

const EnvVarFieldError: React.FC<EnvVarFieldErrorProps> = ({ error, errorId }) => {
  if (!error) {
    return null;
  }

  return (
    <FormHelperText>
      <HelperText>
        <HelperTextItem
          id={errorId}
          variant="error"
          icon={<ExclamationCircleIcon />}
          data-testid={errorId}
        >
          {error}
        </HelperTextItem>
      </HelperText>
    </FormHelperText>
  );
};

type EnvVarTextInputProps = {
  'data-testid': string;
  'aria-label': string;
  value: string;
  hasError: boolean;
  isRequired?: boolean;
  isDisabled?: boolean;
  error?: string;
  errorId?: string;
  onChange: (value: string) => void;
  inputRef?: React.Ref<HTMLInputElement>;
};

const EnvVarTextInput: React.FC<EnvVarTextInputProps> = ({
  'data-testid': dataTestId,
  'aria-label': ariaLabel,
  value,
  hasError,
  isRequired = false,
  isDisabled = false,
  error,
  errorId,
  onChange,
  inputRef,
}) => (
  <>
    <TextInput
      data-testid={dataTestId}
      aria-label={ariaLabel}
      value={value}
      required={isRequired}
      isDisabled={isDisabled}
      aria-invalid={hasError}
      aria-describedby={error ? errorId : undefined}
      onChange={(_event, nextValue) => onChange(nextValue)}
      ref={inputRef}
    />
    <EnvVarFieldError error={error} errorId={errorId} />
  </>
);

type EnvVarValueFieldsProps = {
  envVar: EnvironmentVariable;
  index: number;
  secretNameError: string;
  secretKeyError: string;
  isDisabled?: boolean;
  onUpdate: (updates: EnvironmentVariableUpdates) => void;
};

const EnvVarValueFields: React.FC<EnvVarValueFieldsProps> = ({
  envVar,
  index,
  secretNameError,
  secretKeyError,
  isDisabled = false,
  onUpdate,
}) => {
  if (envVar.type === EnvironmentVariableType.Value) {
    return (
      <TextInput
        data-testid={`env-var-value-${index}`}
        aria-label="env var value"
        value={envVar.value}
        isDisabled={isDisabled}
        onChange={(_event, value) => onUpdate({ value })}
      />
    );
  }

  return (
    <Split hasGutter>
      <SplitItem isFilled>
        <EnvVarTextInput
          data-testid={`env-var-secret-name-${index}`}
          aria-label="env var secret name"
          value={envVar.secretName}
          hasError={Boolean(secretNameError)}
          isRequired
          isDisabled={isDisabled}
          error={secretNameError}
          errorId={`env-var-secret-name-error-${index}`}
          onChange={(value) => onUpdate({ secretName: value })}
        />
      </SplitItem>
      <SplitItem isFilled>
        <EnvVarTextInput
          data-testid={`env-var-secret-key-${index}`}
          aria-label="env var secret key"
          value={envVar.secretKey}
          hasError={Boolean(secretKeyError)}
          isRequired
          isDisabled={isDisabled}
          error={secretKeyError}
          errorId={`env-var-secret-key-error-${index}`}
          onChange={(value) => onUpdate({ secretKey: value })}
        />
      </SplitItem>
    </Split>
  );
};

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
    if (!allowCreate) {
      return;
    }

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
    if (!allowCreate) {
      return;
    }

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
    if (!data.enabled || !allowCreate) {
      return;
    }

    const currentVar = normalizeEnvironmentVariable(data.variables[index]);
    const updatedVar = mergeEnvironmentVariableUpdates(currentVar, updates);
    const newVars = data.variables.map(normalizeEnvironmentVariable);
    newVars[index] = updatedVar;
    onChange?.({ enabled: true, variables: newVars });
  };

  const handleCheckboxChange = (_event: React.FormEvent<HTMLInputElement>, checked: boolean) => {
    if (!allowCreate) {
      return;
    }

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
                <StackItem key={index}>
                  <Split hasGutter>
                    <SplitItem>
                      <SimpleSelect
                        dataTestId={`env-var-type-${index}`}
                        ariaLabel="env var type"
                        options={envVarTypeOptions}
                        value={normalizedEnvVar.type}
                        showSelectedIndicator={false}
                        previewDescription={false}
                        onChange={(key) => {
                          if (isEnvironmentVariableType(key)) {
                            updateEnvVar(index, { type: key });
                          }
                        }}
                        isDisabled={!allowCreate}
                      />
                    </SplitItem>
                    <SplitItem isFilled>
                      <EnvVarTextInput
                        data-testid={`env-var-name-${index}`}
                        aria-label="env var name"
                        value={normalizedEnvVar.name}
                        hasError={Boolean(nameError)}
                        isRequired
                        isDisabled={!allowCreate}
                        error={nameError}
                        errorId={`env-var-name-error-${index}`}
                        onChange={(value) => updateEnvVar(index, { name: value })}
                        inputRef={
                          index === data.variables.length - 1 ? lastNameFieldRef : undefined
                        }
                      />
                    </SplitItem>
                    <SplitItem isFilled>
                      <EnvVarValueFields
                        envVar={normalizedEnvVar}
                        index={index}
                        secretNameError={secretNameError}
                        secretKeyError={secretKeyError}
                        isDisabled={!allowCreate}
                        onUpdate={(updates) => updateEnvVar(index, updates)}
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
                </StackItem>
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
