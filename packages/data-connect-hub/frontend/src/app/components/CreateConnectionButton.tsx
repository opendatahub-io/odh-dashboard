import React from 'react';
import { Button, Tooltip } from '@patternfly/react-core';
import { useConnectionAccess } from '~/app/hooks/useConnectionAccess';
import { getConnectionAccessTooltip } from '~/app/utilities/connectionAccess';

type CreateConnectionButtonProps = {
  namespace: string;
  onCreate: () => void;
  testId?: string;
};

const CreateConnectionButton: React.FC<CreateConnectionButtonProps> = ({
  namespace,
  onCreate,
  testId,
}) => {
  const { isAllowed: canCreateConnection, loaded } = useConnectionAccess(namespace, 'create');
  const isDisabled = !canCreateConnection || !loaded;

  const button = (
    <Button
      variant="primary"
      data-testid={testId}
      isAriaDisabled={isDisabled}
      onClick={() => {
        if (!isDisabled) {
          onCreate();
        }
      }}
    >
      Create connection
    </Button>
  );

  if (isDisabled) {
    return (
      <Tooltip content={loaded ? getConnectionAccessTooltip('create') : 'Checking access...'}>
        {button}
      </Tooltip>
    );
  }

  return button;
};

export default CreateConnectionButton;
