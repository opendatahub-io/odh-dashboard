import * as React from 'react';
import { Button, Divider } from '@patternfly/react-core';
import { EnvVariable } from '../../../types';
import { PlusCircleIcon } from '@patternfly/react-icons';
import EnvTypeSelectField from './EnvTypeSelectField';

type EnvironmentVariablesProps = {
  envVariables: EnvVariable[];
  setEnvVariables: (envVars: EnvVariable[]) => void;
};
const EnvironmentVariables: React.FC<EnvironmentVariablesProps> = ({
  envVariables,
  setEnvVariables,
}) => {
  return (
    <>
      {envVariables.map((envVariable, i) => (
        <React.Fragment key={i}>
          <EnvTypeSelectField
            envVariable={envVariable}
            onUpdate={(updatedVariable) => {
              setEnvVariables(
                envVariables.map((envVariable, mapIndex) =>
                  mapIndex === i ? updatedVariable : envVariable,
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
        isInline
        icon={<PlusCircleIcon />}
        iconPosition="left"
        onClick={() => setEnvVariables([...envVariables, { type: null }])}
      >
        {envVariables.length === 0 ? 'Add variable' : 'Add more variables'}
      </Button>
    </>
  );
};

export default EnvironmentVariables;
