import * as React from 'react';
import { Button, InputGroup, TextInput, InputGroupItem } from '@patternfly/react-core';
import { EyeIcon, EyeSlashIcon } from '@patternfly/react-icons';

const PasswordInput: React.FC<React.ComponentProps<typeof TextInput>> = (props) => {
  const [isPassword, setPassword] = React.useState(true);

  return (
    <InputGroup>
      <InputGroupItem isFill>
        <TextInput {...props} type={isPassword ? 'password' : 'text'} />
      </InputGroupItem>
      <InputGroupItem>
        <Button
          aria-label={isPassword ? 'Show password' : 'Hide password'}
          variant="control"
          onClick={() => setPassword(!isPassword)}
        >
          {isPassword ? <EyeSlashIcon /> : <EyeIcon />}
        </Button>
      </InputGroupItem>
    </InputGroup>
  );
};

export default PasswordInput;
