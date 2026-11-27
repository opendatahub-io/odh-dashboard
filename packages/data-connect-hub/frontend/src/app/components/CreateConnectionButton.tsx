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
  const { isAllowed: canCreateConnection, loaded: createAccessLoaded } = useConnectionAccess(
    namespace,
    'create',
  );
  const { isAllowed: canGetConnectionTypes, loaded: connectionTypesAccessLoaded } =
    useConnectionAccess(namespace, 'get', 'data-connection-types');
  const loaded = createAccessLoaded && connectionTypesAccessLoaded;
  const isDisabled = !canCreateConnection || !canGetConnectionTypes || !loaded;

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
      <Tooltip
        content={
          !loaded
            ? 'Checking access...'
            : canCreateConnection
              ? getConnectionAccessTooltip('get', 'data-connection-types')
              : getConnectionAccessTooltip('create')
        }
      >
        {button}
      </Tooltip>
    );
  }

  return button;
};

export default CreateConnectionButton;
