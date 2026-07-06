import * as React from 'react';
import { Button, Divider } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { EnvVariable } from '#~/pages/projects/types';
import EnvTypeSelectField from './EnvTypeSelectField';

type EnvironmentVariablesProps = {
  envVariables: EnvVariable[];
  setEnvVariables: (envVars: EnvVariable[]) => void;
};
const EnvironmentVariables: React.FC<EnvironmentVariablesProps> = ({
  envVariables,
  setEnvVariables,
}) => (
  <>
    {envVariables.map((envVariable, i) => (
      <React.Fragment key={i}>
        <EnvTypeSelectField
          envVariable={envVariable}
          onUpdate={(updatedVariable) => {
            setEnvVariables(
              envVariables.map((currentEnvVariable, mapIndex) =>
                mapIndex === i ? updatedVariable : currentEnvVariable,
              ),
            );
          }}
          onRemove={() =>
            setEnvVariables(envVariables.filter((v, filterIndex) => filterIndex !== i))
          }
        />
        {i !== envVariables.length - 1 && <Divider />}
      </React.Fragment>
    ))}
    <Button
      variant="link"
      data-testid="add-variable-button"
      isInline
      icon={<PlusCircleIcon />}
      iconPosition="left"
      onClick={() => setEnvVariables([...envVariables, { type: null }])}
    >
      {envVariables.length === 0 ? 'Add variable' : 'Add more variables'}
    </Button>
  </>
);

export default EnvironmentVariables;
