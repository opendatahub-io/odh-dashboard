import * as React from 'react';
import { Button } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { ConfigMapCategories, EnvironmentVariableTypes, EnvVariable } from '../../types';
import { EMPTY_KEY } from './const';
import EnvironmentVariablesRow from './EnvironmentVariablesRow';

type EnvironmentVariablesProps = {
  envVariables: EnvVariable[];
  setEnvVariables: (envVars: EnvVariable[]) => void;
}
const EnvironmentVariables: React.FC<EnvironmentVariablesProps> = ({envVariables, setEnvVariables }) => {
  const onUpdateEnvVariables = (index: number, variable?: EnvVariable) => {
    const updatedEnvVariables = [...envVariables];

    if (!variable) {
      updatedEnvVariables.splice(index, 1); // remove the whole variable at the index
      setEnvVariables(updatedEnvVariables);
      return;
    }

    updatedEnvVariables[index] = { ...variable };
    // updatedRows[index].errors = {};
    // for (let i = 0; i < updatedRows.length; i++) {
    //   if (i !== index) {
    //     updatedRow.variables.forEach((variable) => {
    //       if (updatedRows[i].variables.find((v) => v.name === variable.name)) {
    //         updatedRows[index].errors[variable.name] =
    //           'That name is already in use. Try a different name.';
    //       }
    //     });
    //   }
    // }
    setEnvVariables(updatedEnvVariables);
  };

  const addEnvironmentVariable = () => {
    const newEnvVar: EnvVariable = {
      type: EnvironmentVariableTypes.configMap,
      values: {
        category: ConfigMapCategories.keyValue,
        data: [{key: EMPTY_KEY, value: ''}],
      }
    };
    setEnvVariables([...envVariables, newEnvVar]);
  };

  return (
    <>
      {envVariables.map((envVariable, index) => <EnvironmentVariablesRow
        key={`environment-variable-row-${index}`}
        rowIndex={`environment-variable-row-${index}`}
        envVariable={envVariable}
        onUpdate={(variable) => onUpdateEnvVariables(index, variable)}
      />)}
      <Button
        className="odh-notebook-controller__env-var-add-button"
        isInline
        variant="link"
        onClick={addEnvironmentVariable}
      >
        <PlusCircleIcon />
        {` Add more variables`}
      </Button>
    </>
  );
};

export default EnvironmentVariables;
