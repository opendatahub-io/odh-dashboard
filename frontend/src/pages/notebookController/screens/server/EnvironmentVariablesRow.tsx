import * as React from 'react';
import { Button, Flex } from '@patternfly/react-core';
import { MinusCircleIcon } from '@patternfly/react-icons';
import { CUSTOM_VARIABLE, EMPTY_KEY } from '~/pages/notebookController/const';
import { EnvVarCategoryType, EnvVarType, VariableRow } from '~/types';
import { getDashboardMainContainer } from '~/utilities/utils';
import SimpleSelect from '~/components/SimpleSelect';
import EnvironmentVariablesField from './EnvironmentVariablesField';

type EnvironmentVariablesRowProps = {
  rowIndex: string;
  variableRow: VariableRow;
  categories: EnvVarCategoryType[];
  onUpdate: (updatedRow?: VariableRow) => void;
};

const EnvironmentVariablesRow: React.FC<EnvironmentVariablesRowProps> = ({
  rowIndex,
  variableRow,
  categories,
  onUpdate,
}) => {
  const removeVariables = () => {
    onUpdate();
  };

  const updateVariable = (updatedVariable: EnvVarType, originalName: string) => {
    const updatedRow: VariableRow = {
      variableType: variableRow.variableType,
      variables: [...variableRow.variables],
      errors: { ...variableRow.errors },
    };
    const index = variableRow.variables.findIndex((v) => v.name === originalName);
    if (index >= 0) {
      updatedRow.variables[index] = updatedVariable;
      onUpdate(updatedRow);
    }
  };

  const updateVariableType = (newType: string) => {
    const newCategory = categories.find((category) => category.name === newType);
    let variables: EnvVarType[] = [];
    if (newCategory) {
      variables = newCategory.variables.map((variable) => ({
        name: variable.name,
        type: variable.type,
        value: '',
      }));
    } else if (newType === CUSTOM_VARIABLE) {
      variables = [
        {
          name: EMPTY_KEY,
          type: 'text',
          value: '',
        },
      ];
    }

    const updatedRow: VariableRow = {
      variableType: newType,
      variables,
      errors: {},
    };

    onUpdate(updatedRow);
  };

  return (
    <div className="odh-notebook-controller__env-var-row">
      <Flex>
        <SimpleSelect
          toggleProps={{ style: { width: '70%' } }}
          toggleLabel={variableRow.variableType}
          aria-labelledby="container-size"
          options={[
            { key: CUSTOM_VARIABLE, label: CUSTOM_VARIABLE },
            ...categories.map((category) => ({ key: category.name, label: category.name })),
          ]}
          popperProps={{ appendTo: getDashboardMainContainer() }}
          onChange={updateVariableType}
        />
        <Button
          aria-label="Remove environment variable"
          data-id="remove-env-var-button"
          variant="plain"
          onClick={removeVariables}
        >
          <MinusCircleIcon />
        </Button>
      </Flex>
      {variableRow.variables.map((variable, index) => (
        <EnvironmentVariablesField
          key={`${rowIndex}-${index}`}
          fieldIndex={`${rowIndex}-${index}`}
          variable={variable}
          variableRow={variableRow}
          onUpdateVariable={(updatedVariable) => updateVariable(updatedVariable, variable.name)}
        />
      ))}
    </div>
  );
};

export default EnvironmentVariablesRow;
