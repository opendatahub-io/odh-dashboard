import React from 'react';
import { MenuToggle } from '@patternfly/react-core';

const AuthPlaceholder: React.FC = () => (
  <MenuToggle aria-label="User menu" isDisabled>
    Auth unimplemented
  </MenuToggle>
);

export default AuthPlaceholder;
