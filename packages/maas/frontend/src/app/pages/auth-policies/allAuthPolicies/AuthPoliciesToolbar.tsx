import * as React from 'react';
import { ToolbarItem, Toolbar, ToolbarContent, Button } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { PlusIcon } from '@patternfly/react-icons';
import { URL_PREFIX } from '~/app/utilities/const';

const AuthPoliciesToolbar: React.FC = () => {
  const navigate = useNavigate();
  return (
    <Toolbar>
      <ToolbarContent>
        <ToolbarItem>
          <Button
            variant="primary"
            onClick={() => navigate(`${URL_PREFIX}/auth-policies/create`)}
            data-testid="create-auth-policy-button"
            icon={<PlusIcon />}
          >
            Create policy
          </Button>
        </ToolbarItem>
      </ToolbarContent>
    </Toolbar>
  );
};

export default AuthPoliciesToolbar;
