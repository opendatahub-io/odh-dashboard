import * as React from 'react';
import { Button, Stack, Select, Split, SelectOption, SplitItem, StackItem } from '@patternfly/react-core';
import { MinusCircleIcon } from '@patternfly/react-icons';
import {
  Categories,
  SecretCategories,
  ConfigMapCategories,
  EnvVarType,
  VariableRow,
} from './types';

import KeyValueField from './KeyValueField';
import AWSField from './AWSField';
import UploadField from './UploadField';

type EnvironmentVariablesRowProps = {
  rowIndex: string;
  variableRow: VariableRow;
  onUpdate: (updatedRow?: VariableRow) => void;
};

const EnvironmentVariablesRow: React.FC<EnvironmentVariablesRowProps> = ({
  rowIndex,
  variableRow,
  onUpdate,
}) => {
  const [categoryDropdownOpen, setCategoryDropdownOpen] = React.useState<boolean>(false);
  const [subCategoryDropdownOpen, setSubCategoryDropdownOpen] = React.useState<boolean>(false);
  const [currentCategory, setCurrentCategory] = React.useState<Categories>(Categories.secret);
  const [currentSubCategory, setCurrentSubCategory] = React.useState<
    SecretCategories | ConfigMapCategories
  >(SecretCategories.keyValue);

  const selectOptions = [
    <SelectOption value={'Config Map'} key={'Config Map'} />,
    <SelectOption value={'Secret'} key={'Secret'} />,
  ];
  const secretSelectOptions = [
    <SelectOption value={'Key / Value'} key={'Key Value'} />,
    <SelectOption value={'AWS'} key={'AWS'} />,
  ];
  const configMapSelectOptions = [
    <SelectOption value={'Key / Value'} key={'Key Value'} />,
    <SelectOption value={'Upload'} key={'Upload'} />,
  ];

  const removeVariables = () => {
    onUpdate();
  };

  const getFieldComponent = () => {
    return variableRow.variables.map((variable, index) => {
      if (
        currentSubCategory === SecretCategories.keyValue ||
        currentSubCategory === ConfigMapCategories.keyValue
      )
        return (
          <KeyValueField
            key={`${rowIndex}-${index}`}
            fieldIndex={`${rowIndex}-${index}`}
            variable={{
              ...variable,
              value: variable.value as string,
              type: currentCategory === Categories.secret ? 'password' : 'text',
            }}
            variableRow={variableRow as any}
            onUpdateVariable={(updatedVariable) => updateVariable(updatedVariable, variable.name)}
          />
        );
      if (currentSubCategory === SecretCategories.aws)
        return (
          <AWSField
            key={`${rowIndex}-${index}`}
            fieldIndex={`${rowIndex}-${index}`}
            variable={{
              ...variable,
              type: currentCategory === Categories.secret ? 'password' : 'text',
            }}
            variableRow={variableRow}
            onUpdateVariable={(updatedVariable) => updateVariable(updatedVariable, variable.name)}
          />
        );
      if (currentSubCategory === ConfigMapCategories.upload)
        return (
          <UploadField
            key={`${rowIndex}-${index}`}
            fieldIndex={`${rowIndex}-${index}`}
            variable={{
              ...variable,
              type: currentCategory === Categories.secret ? 'password' : 'text',
            }}
            variableRow={variableRow}
            onUpdateVariable={(updatedVariable) => updateVariable(updatedVariable, variable.name)}
          />
        );
      return <></>;
    });
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

  return (
    <>
      <Stack hasGutter>
      <StackItem>
      <Split hasGutter>
        <SplitItem isFilled>
          <Select
          isOpen={categoryDropdownOpen}
          onToggle={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
          aria-labelledby="container-size"
          selections={currentCategory}
          onSelect={(_e, selection) => {
            selection === 'Secret'
              ? setCurrentCategory(Categories.secret)
              : setCurrentCategory(Categories.configMap);
            setCategoryDropdownOpen(false);
          }}
        >
          {selectOptions}
        </Select>
        </SplitItem>
        <SplitItem>
        <Button data-id="remove-env-var-button" variant="plain" onClick={removeVariables}>
          <MinusCircleIcon />
        </Button>
        </SplitItem>
      </Split>
       </StackItem>
        <StackItem>
        <Select
          isOpen={subCategoryDropdownOpen}
          onToggle={() => setSubCategoryDropdownOpen(!subCategoryDropdownOpen)}
          aria-labelledby="container-size"
          selections={currentSubCategory}
          onSelect={(_e, selection) => {
            debugger;
            if (currentCategory === Categories.secret)
              if (selection === SecretCategories.keyValue) {
                setCurrentSubCategory(SecretCategories.keyValue);
              } else {
                setCurrentSubCategory(SecretCategories.aws);
              }
            else
              selection === SecretCategories.keyValue
                ? setCurrentSubCategory(ConfigMapCategories.keyValue)
                : setCurrentSubCategory(ConfigMapCategories.upload);
            setSubCategoryDropdownOpen(false);
          }}
        >
          {currentCategory === Categories.secret ? secretSelectOptions : configMapSelectOptions}
        </Select>
        </StackItem>
        <StackItem>
        {getFieldComponent()}
        </StackItem>
      </Stack>
    </>
  );
};

export default EnvironmentVariablesRow;
