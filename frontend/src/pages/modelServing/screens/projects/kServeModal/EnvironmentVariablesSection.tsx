import * as React from 'react';
import {
  Button,
  FormGroup,
  Icon,
  List,
  ListItem,
  Popover,
  Split,
  SplitItem,
  Stack,
  TextInput,
  Tooltip,
  FormHelperText,
} from '@patternfly/react-core';
import {
  MinusCircleIcon,
  OutlinedQuestionCircleIcon,
  PlusCircleIcon,
} from '@patternfly/react-icons';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import { CreatingInferenceServiceObject } from '~/pages/modelServing/screens/types';

const VALID_CHARS_REGEX = /^[-._a-zA-Z0-9]*$/;
const STARTS_WITH_DIGIT_REGEX = /^[0-9]/;

type EnvVarWithError = {
  name: string;
  value?: string;
  valueFrom?: {
    secretKeyRef?: {
      name: string;
      key: string;
    };
  };
  error?: string;
};

type EnvironmentVariablesSectionType = {
  predefinedVars?: string[];
  data: CreatingInferenceServiceObject & {
    servingRuntimeEnvVars?: EnvVarWithError[];
  };
  setData: UpdateObjectAtPropAndValue<CreatingInferenceServiceObject>;
};

const EnvironmentVariablesSection: React.FC<EnvironmentVariablesSectionType> = ({
  predefinedVars,
  data,
  setData,
}) => {
  const lastNameFieldRef = React.useRef<HTMLInputElement>(null);
  const addVarButtonRef = React.useRef<HTMLButtonElement>(null);

  const addEnvVar = () => {
    const newVars = [
      ...(data.servingRuntimeEnvVars || []),
      { name: '', value: '' } satisfies EnvVarWithError,
    ];
    setData('servingRuntimeEnvVars', newVars);
    requestAnimationFrame(() => {
      lastNameFieldRef.current?.focus();
      addVarButtonRef.current?.scrollIntoView();
    });
  };

  const removeEnvVar = (indexToRemove: number) => {
    if (data.servingRuntimeEnvVars) {
      const newVars = data.servingRuntimeEnvVars.filter((_, i) => i !== indexToRemove);
      setData('servingRuntimeEnvVars', newVars);
    }
  };

  const validateEnvVarName = (name: string): string | undefined => {
    if (!name) {
      return undefined;
    }
    if (STARTS_WITH_DIGIT_REGEX.test(name)) {
      return 'Must not start with a digit.';
    }
    if (!VALID_CHARS_REGEX.test(name)) {
      return "Must consist of alphabetic characters, digits, '_', '-', or '.'";
    }
    return undefined;
  };

  const updateEnvVar = (indexToUpdate: number, updates: Partial<EnvVarWithError>) => {
    if (data.servingRuntimeEnvVars) {
      const newVars = [...data.servingRuntimeEnvVars];
      newVars[indexToUpdate] = { ...data.servingRuntimeEnvVars[indexToUpdate], ...updates };
      setData('servingRuntimeEnvVars', newVars);
    }
  };

  const handleNameChange = (index: number, value: string) => {
    const error = validateEnvVarName(value);
    updateEnvVar(index, { name: value, error });
  };

  const labelInfo = () => {
    const button = (
      <Button
        data-testid="view-predefined-vars-button"
        variant="link"
        isAriaDisabled={!predefinedVars}
      >
        View predefined variables
      </Button>
    );
    if (!predefinedVars) {
      return (
        <Tooltip
          data-testid="predefined-vars-tooltip"
          content={
            <div>Select a serving runtime to view its predefined environment variables.</div>
          }
        >
          {button}
        </Tooltip>
      );
    }
    return (
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
        {button}
      </Popover>
    );
  };

  return (
    <FormGroup
      label="Additional environment variables"
      labelInfo={labelInfo()}
      labelHelp={
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
      }
      fieldId="serving-runtime-environment-variables"
    >
      <Stack hasGutter>
        {data.servingRuntimeEnvVars?.map((envVar, index) => (
          <Stack hasGutter key={index}>
            <Split hasGutter>
              <SplitItem isFilled>
                <TextInput
                  data-testid={`serving-runtime-environment-variables-input-name ${index}`}
                  aria-label="env var name"
                  value={envVar.name}
                  onChange={(_event: React.FormEvent<HTMLInputElement>, value: string) =>
                    handleNameChange(index, value)
                  }
                  ref={
                    index === data.servingRuntimeEnvVars!.length - 1 ? lastNameFieldRef : undefined
                  }
                  validated={envVar.error ? 'error' : 'default'}
                />
              </SplitItem>
              <SplitItem isFilled>
                <TextInput
                  data-testid={`serving-runtime-environment-variables-input-value ${index}`}
                  aria-label="env var value"
                  value={envVar.value}
                  onChange={(_event: React.FormEvent<HTMLInputElement>, value: string) =>
                    updateEnvVar(index, { value })
                  }
                />
              </SplitItem>
              <SplitItem>
                <Button
                  aria-label="remove-environment-variable"
                  onClick={() => removeEnvVar(index)}
                  variant="plain"
                  icon={<MinusCircleIcon />}
                />
              </SplitItem>
            </Split>
            {envVar.error && (
              <FormHelperText style={{ color: '#D73B3E', maxWidth: '100%', marginTop: '0.5px' }}>
                {envVar.error}
              </FormHelperText>
            )}
          </Stack>
        ))}
        <Button
          isInline
          data-testid="add-environment-variable"
          variant="link"
          onClick={addEnvVar}
          icon={<PlusCircleIcon />}
          ref={addVarButtonRef}
        >
          Add variable
        </Button>
      </Stack>
    </FormGroup>
  );
};

export default EnvironmentVariablesSection;
