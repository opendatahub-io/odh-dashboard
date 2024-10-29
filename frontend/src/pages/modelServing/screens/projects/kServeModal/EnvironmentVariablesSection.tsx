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
  data?: CreatingInferenceServiceObject;
  setData: UpdateObjectAtPropAndValue<CreatingInferenceServiceObject>;
};

const EnvironmentVariablesSection: React.FC<EnvironmentVariablesSectionType> = () => {
  const [additionalEnvVars, setAdditionalEnvVars] = React.useState<
    Array<{ name: string; value: string }>
  >([]);

  const addEnvVar = () => {
    setAdditionalEnvVars((prevVars) => [...prevVars, { name: '', value: '' }]);
  };

  const removeEnvVar = (indexToRemove: number) => {
    setAdditionalEnvVars((prevVars) => prevVars.filter((_, i) => i !== indexToRemove));
  };

  const updateEnvVar = (indexToUpdate: number, updates: { name?: string; value?: string }) => {
    setAdditionalEnvVars((prevVars) => {
      const newVars = [...prevVars];
      newVars[indexToUpdate] = { ...prevVars[indexToUpdate], ...updates };
      return newVars;
    });
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
      fieldId="model-server-replicas"
    >
      <Stack hasGutter>
        {additionalEnvVars.map((envVar, index) => (
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
