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
import { AWS_KEYS } from './const';

type AWSFieldProps = {
  fieldIndex: string;
  fieldData: { key: string; value: string | number };
  onUpdateValue: (value: string) => void;
};

export const AWSField: React.FC<AWSFieldProps> = ({ fieldIndex, fieldData, onUpdateValue }) => {
  const [showPassword, setShowPassword] = React.useState<boolean>(false);
  const isPassword = fieldData.key === AWS_KEYS.SECRET_ACCESS_KEY;

  return (
    <FormGroup fieldId={`${fieldIndex}-${fieldData.key}`} label={fieldData.key}>
      <Flex>
        <InputGroup>
          <TextInput
            id={`${fieldIndex}-${fieldData.key}`}
            type={showPassword || !isPassword ? TextInputTypes.text : TextInputTypes.password}
            onChange={onUpdateValue}
            value={fieldData.value}
          />

          {isPassword ? (
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
  );
};

export default AWSField;
