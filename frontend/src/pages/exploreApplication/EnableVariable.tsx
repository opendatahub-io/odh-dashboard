import * as React from 'react';
import {
  Button,
  ButtonVariant,
  FormGroup,
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
    const [showPassword, setShowPassword] = React.useState<boolean>(false);

    return (
      <FormGroup fieldId={label} label={label} helperText={helperText}>
        <TextInput
          className="odh-enable-modal__variable-input"
          id={label}
          ref={ref}
          isDisabled={validationInProgress}
          type={
            inputType === TextInputTypes.password && showPassword ? TextInputTypes.text : inputType
          }
          value={value || ''}
          onChange={(newValue) => updateValue(newValue)}
        />
        {inputType === TextInputTypes.password ? (
          <Button
            className="odh-enable-modal__toggle-password-vis"
            variant={ButtonVariant.link}
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <EyeSlashIcon /> : <EyeIcon />}
          </Button>
        ) : null}
      </FormGroup>
    );
  },
);
EnableVariable.displayName = 'EnableVariable';

export default EnableVariable;
