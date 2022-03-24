import * as React from 'react';
import { Button, Flex, FlexItem, Select, SelectOption } from '@patternfly/react-core';
import { MinusCircleIcon } from '@patternfly/react-icons';
import { CUSTOM_VARIABLE, EMPTY_KEY } from '../const';
import { EnvVarCategoryType, EnvVarType, VariableRow } from '../../../types';
import EnvironmentVariablesField from './EnvironmentVariablesField';

type EnvironmentVariablesRowProps = {
  variableRow: VariableRow;
  categories: EnvVarCategoryType[];
  onUpdate: (updatedRow?: VariableRow) => void;
};

const EnvironmentVariablesRow: React.FC<EnvironmentVariablesRowProps> = ({
  variableRow,
  categories,
  onUpdate,
}) => {
  const [typeDropdownOpen, setTypeDropdownOpen] = React.useState<boolean>(false);
  const categoryOptions = categories.map((category) => (
    <SelectOption value={category.name} key={category.name} />
  ));
  const selectOptions = [
    <SelectOption value={CUSTOM_VARIABLE} key={CUSTOM_VARIABLE} />,
    ...categoryOptions,
  ];

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
      variables = newCategory.variables.map((variable) => {
        return {
          name: variable.name,
          type: variable.type,
          value: '',
        };
      });
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
      variables: variables,
      errors: {},
    };

    onUpdate(updatedRow);
    setTypeDropdownOpen(false);
  };

  return (
    <>
      <Flex>
        <FlexItem>
          <Select
            isOpen={typeDropdownOpen}
            onToggle={() => setTypeDropdownOpen(!typeDropdownOpen)}
            aria-labelledby="container-size"
            selections={variableRow.variableType}
            onSelect={(e, selection) => updateVariableType(selection as string)}
          >
            {selectOptions}
          </Select>
        </FlexItem>
        <FlexItem>
          <Button variant="plain" onClick={removeVariables}>
            <MinusCircleIcon />
          </Button>
        </FlexItem>
      </Flex>
      {variableRow.variables.map((variable, index) => (
        <EnvironmentVariablesField
          key={index}
          variable={variable}
          variableRow={variableRow}
          onUpdateVariable={(updatedVariable) => updateVariable(updatedVariable, variable.name)}
        />
      ))}
    </>
  );
};

export default EnvironmentVariablesRow;
