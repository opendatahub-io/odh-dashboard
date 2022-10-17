import * as React from 'react';
import {
  Button,
  Flex,
  FormGroup,
  InputGroup,
  TextInput,
  TextInputTypes,
} from '@patternfly/react-core';
import { ExclamationCircleIcon, EyeIcon, EyeSlashIcon } from '@patternfly/react-icons';
import { EMPTY_KEY } from './const';
import { AWSEnvVarValue, EnvVarType, VariableRow } from './types';

type AWSFieldProps = {
  fieldIndex: string;
  variable: EnvVarType;
  variableRow: VariableRow;
  onUpdateVariable: (updatedVariable: EnvVarType) => void;
};

export const AWSField: React.FC<AWSFieldProps> = ({
  fieldIndex,
  variable,
  onUpdateVariable,
  variableRow,
}) => {
  const [showPassword, setShowPassword] = React.useState<boolean>(false);
  const [variableType, setVariableType] = React.useState<string>(variable.type);

  React.useEffect(() => {
    setVariableType(variable.type);
  }, [variable.type]);

  const validated = variableRow.errors[variable.name] !== undefined ? 'error' : 'default';
  return (
    <div>
      <FormGroup
        fieldId={`${fieldIndex}-${variable.name}`}
        label="Name"
        helperTextInvalid={variableRow.errors[variable.name]}
        helperTextInvalidIcon={<ExclamationCircleIcon />}
        validated={validated}
      >
        <TextInput
          id={`${fieldIndex}-${variable.name}`}
          data-id={`${fieldIndex}-${variable.name}`}
          type={TextInputTypes.text}
          onChange={(newKey) =>
            onUpdateVariable({ name: newKey, type: variable.type, value: variable.value })
          }
          value={variable.name === EMPTY_KEY ? '' : variable.name}
          validated={validated}
        />
      </FormGroup>
      <FormGroup
        fieldId={`${fieldIndex}-${(variable.value as AWSEnvVarValue).AWS_ACCESS_KEY_ID}`}
        label="AWS_ACCESS_KEY_ID"
        helperTextInvalid={variableRow.errors[variable.name]}
        helperTextInvalidIcon={<ExclamationCircleIcon />}
        validated={validated}
      >
        <TextInput
          id={`${fieldIndex}-${variable.name}`}
          data-id={`${fieldIndex}-${variable.name}`}
          type={TextInputTypes.text}
          onChange={(newKey) =>
            onUpdateVariable({ name: newKey, type: variable.type, value: variable.value })
          }
          value={
            (variable.value as AWSEnvVarValue).AWS_ACCESS_KEY_ID === EMPTY_KEY
              ? ''
              : (variable.value as AWSEnvVarValue).AWS_ACCESS_KEY_ID
          }
          validated={validated}
        />
      </FormGroup>
      <FormGroup fieldId={`${fieldIndex}-${variable.name}-value`} label="AWS_SECRET_ACCESS_KEY">
        <Flex>
          <InputGroup>
            <TextInput
              id={`${fieldIndex}-${variable.name}-value`}
              data-id={`${fieldIndex}-${variable.name}-value`}
              type={
                showPassword && variableType === 'password'
                  ? TextInputTypes.text
                  : (variable.type as TextInputTypes)
              }
              value={(variable.value as AWSEnvVarValue).AWS_SECRET_ACCESS_KEY}
              onChange={(newValue) =>
                onUpdateVariable({ name: variable.name, type: variable.type, value: newValue })
              }
            />
            {variable.type === 'password' ? (
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
      <FormGroup
        fieldId={`${fieldIndex}-${(variable.value as AWSEnvVarValue).AWS_DEFAULT_REGION}`}
        label="AWS_DEFAULT_REGION"
        helperTextInvalid={variableRow.errors[variable.name]}
        helperTextInvalidIcon={<ExclamationCircleIcon />}
        validated={validated}
      >
        <TextInput
          id={`${fieldIndex}-${variable.name}`}
          data-id={`${fieldIndex}-${variable.name}`}
          type={TextInputTypes.text}
          onChange={(newKey) =>
            onUpdateVariable({ name: newKey, type: variable.type, value: variable.value })
          }
          value={
            (variable.value as AWSEnvVarValue).AWS_DEFAULT_REGION === undefined
              ? 'us-east-1'
              : (variable.value as AWSEnvVarValue).AWS_DEFAULT_REGION
          }
          validated={validated}
        />
      </FormGroup>
      <FormGroup
        fieldId={`${fieldIndex}-${(variable.value as AWSEnvVarValue).AWS_S3_ENDPOINT}`}
        label="AWS_S3_ENDPOINT"
        helperTextInvalid={variableRow.errors[variable.name]}
        helperTextInvalidIcon={<ExclamationCircleIcon />}
        validated={validated}
      >
        <TextInput
          id={`${fieldIndex}-${variable.name}`}
          data-id={`${fieldIndex}-${variable.name}`}
          type={TextInputTypes.text}
          onChange={(newKey) =>
            onUpdateVariable({ name: newKey, type: variable.type, value: variable.value })
          }
          value={
            (variable.value as AWSEnvVarValue).AWS_S3_ENDPOINT === undefined
              ? 'https://s3.amazonaws.com/'
              : (variable.value as AWSEnvVarValue).AWS_S3_ENDPOINT
          }
          validated={validated}
        />
      </FormGroup>
    </div>
  );
};

export default AWSField;
