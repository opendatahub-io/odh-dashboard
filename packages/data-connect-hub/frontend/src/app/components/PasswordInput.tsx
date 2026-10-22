import React from 'react';
import { Button, InputGroup, InputGroupItem, TextInput } from '@patternfly/react-core';
import { EyeIcon, EyeSlashIcon } from '@patternfly/react-icons';

type PasswordInputProps = Omit<React.ComponentProps<typeof TextInput>, 'type'> & {
  ariaLabelShow?: string;
  ariaLabelHide?: string;
};

const PasswordInput: React.FC<PasswordInputProps> = ({
  ariaLabelShow = 'Show value',
  ariaLabelHide = 'Hide value',
  ...props
}) => {
  const [isValueHidden, setIsValueHidden] = React.useState(true);

  return (
    <InputGroup>
      <InputGroupItem isFill>
        <TextInput {...props} type={isValueHidden ? 'password' : 'text'} />
      </InputGroupItem>
      <InputGroupItem>
        <Button
          aria-label={isValueHidden ? ariaLabelShow : ariaLabelHide}
          variant="control"
          onClick={() => setIsValueHidden(!isValueHidden)}
        >
          {isValueHidden ? (
            <EyeSlashIcon data-testid="hidden-value-icon" />
          ) : (
            <EyeIcon data-testid="visible-value-icon" />
          )}
        </Button>
      </InputGroupItem>
    </InputGroup>
  );
};

export default PasswordInput;
