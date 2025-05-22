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
  HelperText,
  HelperTextItem,
} from '@patternfly/react-core';
import {
  MinusCircleIcon,
  OutlinedQuestionCircleIcon,
  PlusCircleIcon,
  ExclamationCircleIcon,
} from '@patternfly/react-icons';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import { CreatingInferenceServiceObject } from '~/pages/modelServing/screens/types';
import { isValueFromEnvVar, validateEnvVarName } from '~/pages/modelServing/screens/projects/utils';
import { ServingContainer } from '~/k8sTypes';

type EnvironmentVariablesSectionType = {
  predefinedVars?: string[];
  data: CreatingInferenceServiceObject & {
    servingRuntimeEnvVars?: ServingContainer['env'];
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
    const newVars = [...(data.servingRuntimeEnvVars || []), { name: '', value: '' }];
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

  const updateEnvVar = (
    index: number,
    updates: {
      name?: string;
      value?: string;
      valueFrom?: { secretKeyRef?: { name: string; key: string } };
    },
  ) => {
    const currentVars = data.servingRuntimeEnvVars || [];
    const newVars: ServingContainer['env'] = [...currentVars];
    const updatedVar = { ...newVars[index], ...updates };
    newVars[index] = updatedVar;
    setData('servingRuntimeEnvVars', newVars);
  };

  const labelInfo = () => {
    const button = (
      <Button
        isInline
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
        {data.servingRuntimeEnvVars?.map((envVar, index) => {
          const error = validateEnvVarName(envVar.name);
          const isEnvVarValueFrom = isValueFromEnvVar(envVar);
          return (
            <Split hasGutter key={index}>
              <SplitItem isFilled>
                <TextInput
                  data-testid={`serving-runtime-environment-variables-input-name ${index}`}
                  aria-label="env var name"
                  value={envVar.name}
                  onChange={(_event, value) => updateEnvVar(index, { name: value })}
                  ref={
                    data.servingRuntimeEnvVars && index === data.servingRuntimeEnvVars.length - 1
                      ? lastNameFieldRef
                      : undefined
                  }
                  validated={error ? 'error' : 'default'}
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
                <Tooltip
                  trigger={isEnvVarValueFrom ? 'mouseenter' : ''}
                  content={
                    <>
                      <div>{JSON.stringify(envVar.valueFrom)}</div>
                      <br />
                      <div>
                        The value of this variable is defined by a key of a ConfigMap/Secret. It can
                        only be edited from the OpenShift console.
                      </div>
                    </>
                  }
                >
                  <TextInput
                    data-testid={`serving-runtime-environment-variables-input-value ${index}`}
                    aria-label="env var value"
                    value={envVar.value ? envVar.value : JSON.stringify(envVar.valueFrom)}
                    isDisabled={isEnvVarValueFrom}
                    onChange={(_event: React.FormEvent<HTMLInputElement>, value: string) =>
                      updateEnvVar(index, { value })
                    }
                  />
                </Tooltip>
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
          );
        })}
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
