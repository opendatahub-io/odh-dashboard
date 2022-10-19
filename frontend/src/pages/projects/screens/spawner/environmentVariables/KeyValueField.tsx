import * as React from 'react';
import {
  Button,
  Flex,
  FormGroup,
  InputGroup,
  TextInput,
  TextInputTypes,
} from '@patternfly/react-core';
import { EyeIcon, EyeSlashIcon } from '@patternfly/react-icons';
import { EMPTY_KEY } from './const';
import { EnvironmentVariableTypes, EnvVariable } from '../../../types';

type KeyValueFieldProps = {
  fieldIndex: string;
  variable: EnvVariable;
  onUpdateVariable: (variable: EnvVariable) => void;
};

export const KeyValueField: React.FC<KeyValueFieldProps> = ({
  fieldIndex,
  variable,
  onUpdateVariable,
}) => {
  const [showPassword, setShowPassword] = React.useState<boolean>(false);

  //const validated = variableRow.errors[variable.name] !== undefined ? 'error' : 'default';
  return (
    <div className="odh-notebook-controller__env-var-field">
      <FormGroup fieldId={`${fieldIndex}-${variable.type}`} label="Variable name">
        <TextInput
          id={`${fieldIndex}-${variable.type}`}
          data-id={`${fieldIndex}-${variable.type}`}
          type={TextInputTypes.text}
          onChange={(newKey) =>
            onUpdateVariable({
              type: variable.type,
              values: {
                ...variable.values,
                data: [{ ...variable.values.data[0], key: newKey }],
              },
            })
          }
          value={variable.values.data[0].key === EMPTY_KEY ? '' : variable.values.data[0].key}
        />
      </FormGroup>
      <FormGroup fieldId={`${fieldIndex}-${variable.type}-value`} label="Variable value">
        <Flex>
          <InputGroup>
            <TextInput
              id={`${fieldIndex}-${variable.type}-value`}
              data-id={`${fieldIndex}-${variable.type}-value`}
              type={
                showPassword || variable.type === EnvironmentVariableTypes.configMap
                  ? TextInputTypes.text
                  : TextInputTypes.password
              }
              value={variable.values.data[0].value}
              onChange={(newValue) =>
                onUpdateVariable({
                  type: variable.type,
                  values: {
                    ...variable.values,
                    data: [{ ...variable.values.data[0], value: newValue }],
                  },
                })
              }
            />
            {variable.type === EnvironmentVariableTypes.secret ? (
              <Button
                data-id="show-password-button"
                variant="control"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
              </Button>
            ) : null}
          </InputGroup>
        </Flex>
      </FormGroup>
    </div>
  );
};

export default KeyValueField;
