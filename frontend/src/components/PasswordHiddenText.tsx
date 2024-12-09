import { Button, Flex, FlexItem, Content } from '@patternfly/react-core';
import { EyeIcon, EyeSlashIcon } from '@patternfly/react-icons';
import React from 'react';

type PasswordHiddenTextProps = {
  password: string;
};

const PasswordHiddenText: React.FC<PasswordHiddenTextProps> = ({ password }) => {
  const [isHidden, setIsHidden] = React.useState(true);

  const passwordText = isHidden ? Array(password.length).fill('\u25CF').join('') : password;

  return (
    <Flex
      spaceItems={{ default: 'spaceItemsNone' }}
      spacer={{ default: 'spacerNone' }}
      alignItems={{ default: 'alignItemsCenter' }}
      flexWrap={{ default: 'nowrap' }}
    >
      <FlexItem>
        <Content component="p">{passwordText}</Content>
      </FlexItem>
      <FlexItem>
        <Button
          icon={isHidden ? <EyeSlashIcon /> : <EyeIcon />}
          variant="plain"
          onClick={() => setIsHidden(!isHidden)}
          data-testid="password-hidden-button"
        />
      </FlexItem>
    </Flex>
  );
};

export default PasswordHiddenText;
