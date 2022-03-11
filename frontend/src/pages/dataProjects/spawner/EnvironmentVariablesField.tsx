import * as React from 'react';
import {
  Button,
  Checkbox,
  Flex,
  FlexItem,
  FormGroup,
  InputGroup,
  TextInput,
  TextInputTypes,
} from '@patternfly/react-core';
import { ExclamationCircleIcon, EyeIcon, EyeSlashIcon } from '@patternfly/react-icons';
import { CUSTOM_VARIABLE, EMPTY_KEY } from '../const';
import { EnvVarType, VariableRow } from '../../../types';

type EnvironmentVariablesFieldProps = {
  variable: EnvVarType;
  variableRow: VariableRow;
  onUpdateVariable: (updatedVariable: EnvVarType) => void;
};

const EnvironmentVariablesField: React.FC<EnvironmentVariablesFieldProps> = ({
  variable,
  onUpdateVariable,
  variableRow,
}) => {
  const [showPassword, setShowPassword] = React.useState<boolean>(false);
  const [variableType, setVariableType] = React.useState<string>(variable.type);

  React.useEffect(() => {
    setVariableType(variable.type);
  }, [variable.type]);

  const handleSecretChange = (checked) => {
    variable.type = checked ? 'password' : 'text';
    setVariableType(variable.type);
  };

  const validated = variableRow.errors[variable.name] !== undefined ? 'error' : 'default';
  return (
    <div className="odh-data-projects__modal-var-field">
      <FormGroup
        fieldId={variable.name}
        label="Variable name"
        helperTextInvalid={variableRow.errors[variable.name]}
        helperTextInvalidIcon={<ExclamationCircleIcon />}
        validated={validated}
      >
        <TextInput
          id={variable.name}
          type={TextInputTypes.text}
          onChange={(newKey) =>
            onUpdateVariable({ name: newKey, type: variable.type, value: variable.value })
          }
          value={variable.name === EMPTY_KEY ? '' : variable.name}
          validated={validated}
        />
      </FormGroup>
      <FormGroup fieldId={`${variable.name}-value`} label="Variable value">
        <Flex>
          <FlexItem>
            <InputGroup>
              <TextInput
                id={`${variable.name}-value`}
                type={
                  showPassword && variableType === 'password'
                    ? TextInputTypes.text
                    : (variable.type as TextInputTypes)
                }
                value={variable.value}
                onChange={(newValue) =>
                  onUpdateVariable({ name: variable.name, type: variable.type, value: newValue })
                }
              />
              {variable.type === 'password' ? (
                <Button variant="control" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
                </Button>
              ) : null}
            </InputGroup>
          </FlexItem>
          {variableRow.variableType === CUSTOM_VARIABLE ? (
            <FlexItem>
              <Checkbox
                className={variableType === 'password' ? ' m-is-secret' : ''}
                label="Secret"
                isChecked={variableType === 'password'}
                onChange={handleSecretChange}
                aria-label="secret"
                id={`${variable.name}-secret`}
                name="secret"
              />
            </FlexItem>
          ) : null}
        </Flex>
      </FormGroup>
    </div>
  );
};

export default EnvironmentVariablesField;
