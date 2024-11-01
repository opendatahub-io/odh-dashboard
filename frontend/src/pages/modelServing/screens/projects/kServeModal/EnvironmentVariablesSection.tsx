import * as React from 'react';
import {
  Button,
  FormGroup,
  Icon,
  Popover,
  Split,
  SplitItem,
  Stack,
  TextInput,
} from '@patternfly/react-core';
import {
  MinusCircleIcon,
  OutlinedQuestionCircleIcon,
  PlusCircleIcon,
} from '@patternfly/react-icons';
import { UpdateObjectAtPropAndValue } from '~/pages/projects/types';
import { CreatingInferenceServiceObject } from '~/pages/modelServing/screens/types';

type EnvironmentVariablesSectionType = {
  data: CreatingInferenceServiceObject;
  setData: UpdateObjectAtPropAndValue<CreatingInferenceServiceObject>;
};

const EnvironmentVariablesSection: React.FC<EnvironmentVariablesSectionType> = ({
  data,
  setData,
}) => {
  const addEnvVar = () => {
    const newVars = [...(data.servingRuntimeEnvVars || []), { name: '', value: '' }];
    setData('servingRuntimeEnvVars', newVars);
  };

  const removeEnvVar = (indexToRemove: number) => {
    if (data.servingRuntimeEnvVars) {
      const newVars = data.servingRuntimeEnvVars.filter((_, i) => i !== indexToRemove);
      setData('servingRuntimeEnvVars', newVars);
    }
  };

  const updateEnvVar = (indexToUpdate: number, updates: { name?: string; value?: string }) => {
    if (data.servingRuntimeEnvVars) {
      const newVars = [...data.servingRuntimeEnvVars];
      newVars[indexToUpdate] = { ...data.servingRuntimeEnvVars[indexToUpdate], ...updates };
      setData('servingRuntimeEnvVars', newVars);
    }
  };

  return (
    <FormGroup
      label="Additional environment variables"
      labelIcon={
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
      fieldId="environment-variables"
    >
      <Stack hasGutter>
        {data.servingRuntimeEnvVars?.map((envVar, index) => (
          <Split hasGutter key={index}>
            <SplitItem isFilled>
              <TextInput
                aria-label="env var name"
                value={envVar.name}
                onChange={(_event: React.FormEvent<HTMLInputElement>, value: string) =>
                  updateEnvVar(index, { name: value })
                }
              />
            </SplitItem>
            <SplitItem isFilled>
              <TextInput
                aria-label="env var value"
                value={envVar.value}
                onChange={(_event: React.FormEvent<HTMLInputElement>, value: string) =>
                  updateEnvVar(index, { value })
                }
              />
            </SplitItem>
            <SplitItem>
              <Button
                onClick={() => removeEnvVar(index)}
                variant="plain"
                icon={<MinusCircleIcon />}
              />
            </SplitItem>
          </Split>
        ))}
        <Button isInline variant="link" onClick={addEnvVar} icon={<PlusCircleIcon />}>
          Add variable
        </Button>
      </Stack>
    </FormGroup>
  );
};

export default EnvironmentVariablesSection;
