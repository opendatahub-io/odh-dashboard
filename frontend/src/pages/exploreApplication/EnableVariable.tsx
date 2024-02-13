import * as React from 'react';
import {
  Button,
  ButtonVariant,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  InputGroup,
  InputGroupItem,
  TextInput,
  TextInputTypes,
} from '@patternfly/react-core';
import { EyeIcon, EyeSlashIcon } from '@patternfly/react-icons';

type EnableVariableProps = {
  label: string;
  inputType: TextInputTypes;
  helperText?: string;
  validationInProgress: boolean;
  value: string;
  updateValue: (value: string) => void;
};

const EnableVariable = React.forwardRef<HTMLInputElement, EnableVariableProps>(
  ({ label, inputType, helperText, validationInProgress, value, updateValue }, ref) => {
    const [showPassword, setShowPassword] = React.useState(false);

    return (
      <FormGroup fieldId={label} label={label}>
        <InputGroup>
          <InputGroupItem isFill>
            <TextInput
              id={label}
              data-id={label}
              ref={ref}
              isDisabled={validationInProgress}
              type={
                inputType === TextInputTypes.password && showPassword
                  ? TextInputTypes.text
                  : inputType
              }
              value={value || ''}
              onChange={(e, newValue) => updateValue(newValue)}
            />
          </InputGroupItem>
          {inputType === TextInputTypes.password ? (
            <InputGroupItem>
              <Button variant={ButtonVariant.link} onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
              </Button>
            </InputGroupItem>
          ) : null}
        </InputGroup>
        <FormHelperText>
          <HelperText>
            <HelperTextItem>{helperText}</HelperTextItem>
          </HelperText>
        </FormHelperText>
      </FormGroup>
    );
  },
);
EnableVariable.displayName = 'EnableVariable';

export default EnableVariable;
