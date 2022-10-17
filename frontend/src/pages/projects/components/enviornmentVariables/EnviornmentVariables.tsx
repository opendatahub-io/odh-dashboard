import * as React from 'react';
import { Button } from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { VariableRow } from 'types';
import { CUSTOM_VARIABLE, EMPTY_KEY } from './const';
import EnvironmentVariablesRow from './EnvironmentVariablesRow';

const EnviornmentVariables: React.FC = () => {
  const [variableRows, setVariableRows] = React.useState<VariableRow[]>([]);

  const onUpdateRow = (index: number, updatedRow?: VariableRow) => {
    const updatedRows = [...variableRows];

    if (!updatedRow) {
      updatedRows.splice(index, 1); // remove the whole variable at the index
      setVariableRows(updatedRows);
      return;
    }

    updatedRows[index] = { ...updatedRow };
    updatedRows[index].errors = {};
    for (let i = 0; i < updatedRows.length; i++) {
      if (i !== index) {
        updatedRow.variables.forEach((variable) => {
          if (updatedRows[i].variables.find((v) => v.name === variable.name)) {
            updatedRows[index].errors[variable.name] =
              'That name is already in use. Try a different name.';
          }
        });
      }
    }
    setVariableRows(updatedRows);
  };

  const addEnvironmentVariableRow = () => {
    const newRow: VariableRow = {
      variableType: CUSTOM_VARIABLE,
      variables: [
        {
          name: EMPTY_KEY,
          type: 'password',
          value: '',
        },
      ],
      errors: {},
    };
    setVariableRows([...variableRows, newRow]);
  };
  const renderEnvironmentVariableRows = () => {
    if (!variableRows?.length) {
      return null;
    }
    return variableRows.map((row, index) => (
      <EnvironmentVariablesRow
        key={`environment-variable-row-${index}`}
        rowIndex={`environment-variable-row-${index}`}
        variableRow={row}
        onUpdate={(updatedRow) => onUpdateRow(index, updatedRow as any)}
      />
    ));
  };
  return (
    <div>
      {renderEnvironmentVariableRows()}
      <Button
        className="odh-notebook-controller__env-var-add-button"
        isInline
        variant="link"
        onClick={addEnvironmentVariableRow}
      >
        <PlusCircleIcon />
        {` Add more variables`}
      </Button>
    </div>
  );
};

export default EnviornmentVariables;
