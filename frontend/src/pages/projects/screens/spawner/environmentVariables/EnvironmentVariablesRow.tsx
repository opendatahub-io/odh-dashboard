import * as React from 'react';
import {
  Button,
  Stack,
  Select,
  Split,
  SelectOption,
  SplitItem,
  StackItem,
} from '@patternfly/react-core';
import { MinusCircleIcon } from '@patternfly/react-icons';
import {
  SecretCategories,
  ConfigMapCategories,
  EnvVariable,
  EnvironmentVariableTypes,
} from '../../../types';

import KeyValueField from './KeyValueField';
import AWSField from './AWSField';
import { EMPTY_AWS_SECRET_DATA, EMPTY_KEY } from './const';

type EnvironmentVariablesRowProps = {
  rowIndex: string;
  envVariable: EnvVariable;
  onUpdate: (envVariable?: EnvVariable) => void;
};

const EnvironmentVariablesRow: React.FC<EnvironmentVariablesRowProps> = ({
  rowIndex,
  envVariable,
  onUpdate,
}) => {
  const [categoryDropdownOpen, setCategoryDropdownOpen] = React.useState<boolean>(false);
  const [subCategoryDropdownOpen, setSubCategoryDropdownOpen] = React.useState<boolean>(false);

  const selectOptions = [
    <SelectOption
      value={EnvironmentVariableTypes.configMap}
      key={EnvironmentVariableTypes.configMap}
    />,
    <SelectOption value={EnvironmentVariableTypes.secret} key={EnvironmentVariableTypes.secret} />,
  ];
  const secretSelectOptions = [
    <SelectOption value={SecretCategories.keyValue} key={SecretCategories.keyValue} />,
    <SelectOption value={SecretCategories.aws} key={SecretCategories.aws} />,
  ];
  const configMapSelectOptions = [
    <SelectOption value={ConfigMapCategories.keyValue} key={ConfigMapCategories.keyValue} />,
    <SelectOption value={ConfigMapCategories.upload} key={ConfigMapCategories.upload} />,
  ];

  const removeVariables = () => {
    onUpdate();
  };

  const getFieldComponent = () => {
    if (
      envVariable.values.category === SecretCategories.keyValue ||
      envVariable.values.category === ConfigMapCategories.keyValue
    ) {
      return (
        <KeyValueField
          fieldIndex={rowIndex}
          variable={envVariable}
          onUpdateVariable={(updatedVariable) => onUpdate(updatedVariable)}
        />
      );
    }
    if (envVariable.values.category === SecretCategories.aws) {
      return envVariable.values.data.map((awsData, awsIndex) => (
        <AWSField
          key={`${rowIndex}-${awsIndex}`}
          fieldIndex={`${rowIndex}-${awsIndex}`}
          fieldData={awsData}
          onUpdateValue={(updatedValue) => onUpdateAWSValue(awsIndex, updatedValue)}
        />
      ));
    }
    // TODO: add config map upload field
    return <></>;
  };

  const onUpdateAWSValue = (index: number, value: string) => {
    const newData = [...envVariable.values.data];
    newData[index] = { key: envVariable.values.data[index].key, value };
    onUpdate({
      ...envVariable,
      values: {
        ...envVariable.values,
        data: newData,
      },
    });
  };

  const isEnvironmentVariableType = (type: unknown): type is EnvironmentVariableTypes => {
    return (type as EnvironmentVariableTypes) !== undefined;
  };

  const isSubCategoryType = (type: unknown): type is ConfigMapCategories | SecretCategories => {
    return (type as ConfigMapCategories | SecretCategories) !== undefined;
  };

  return (
    <Stack hasGutter>
      <StackItem>
        <Split hasGutter>
          <SplitItem isFilled>
            <Select
              isOpen={categoryDropdownOpen}
              onToggle={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
              aria-labelledby="container-size"
              selections={envVariable.type}
              onSelect={(_e, selection) => {
                if (isEnvironmentVariableType(selection)) {
                  const subCategory =
                    selection === EnvironmentVariableTypes.secret
                      ? SecretCategories.keyValue
                      : ConfigMapCategories.keyValue;
                  onUpdate({
                    type: selection,
                    values: {
                      category: subCategory,
                      data: [{ key: EMPTY_KEY, value: '' }],
                    },
                  });
                }
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
          selections={envVariable.values.category}
          onSelect={(_e, selection) => {
            if (isSubCategoryType(selection)) {
              let data: { key: string; value: string }[] = [{ key: EMPTY_KEY, value: '' }];
              if (selection === SecretCategories.aws) {
                data = EMPTY_AWS_SECRET_DATA;
              }
              onUpdate({
                ...envVariable,
                values: {
                  category: selection,
                  data: data,
                },
              });
            }
            setSubCategoryDropdownOpen(false);
          }}
        >
          {envVariable.type === EnvironmentVariableTypes.secret
            ? secretSelectOptions
            : configMapSelectOptions}
        </Select>
      </StackItem>
      <StackItem>{getFieldComponent()}</StackItem>
    </Stack>
  );
};

export default EnvironmentVariablesRow;
