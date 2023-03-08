import * as React from 'react';
import { Button, InputGroup, TextInput } from '@patternfly/react-core';
import { EyeIcon, EyeSlashIcon } from '@patternfly/react-icons';

const PasswordInput: React.FC<React.ComponentProps<typeof TextInput>> = (props) => {
  const [isPassword, setPassword] = React.useState(true);

  return (
    <InputGroup>
      <TextInput {...props} type={isPassword ? 'password' : 'text'} />
      <Button
        aria-label={isPassword ? 'Show key' : 'Hide key'}
        variant="control"
        onClick={() => setPassword(!isPassword)}
      >
        {isPassword ? <EyeSlashIcon /> : <EyeIcon />}
      </Button>
    </InputGroup>
  );
};

export default PasswordInput;
