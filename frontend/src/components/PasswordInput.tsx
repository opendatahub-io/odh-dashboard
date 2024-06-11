import * as React from 'react';
import { Button, InputGroup, TextInput, InputGroupItem } from '@patternfly/react-core';
import { EyeIcon, EyeSlashIcon } from '@patternfly/react-icons';

const PasswordInput: React.FC<React.ComponentProps<typeof TextInput>> = (props) => {
  const [isPasswordHidden, setPasswordHidden] = React.useState(true);

  return (
    <InputGroup>
      <InputGroupItem isFill>
        <TextInput {...props} type={isPasswordHidden ? 'password' : 'text'} />
      </InputGroupItem>
      <InputGroupItem>
        <Button
          aria-label={isPasswordHidden ? 'Show password' : 'Hide password'}
          variant="control"
          onClick={() => setPasswordHidden(!isPasswordHidden)}
        >
          {isPasswordHidden ? <EyeSlashIcon /> : <EyeIcon />}
        </Button>
      </InputGroupItem>
    </InputGroup>
  );
};

export default PasswordInput;
