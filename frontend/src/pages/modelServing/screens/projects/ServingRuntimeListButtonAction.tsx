import * as React from 'react';
import { Button, Tooltip, Text } from '@patternfly/react-core';

type ServingRuntimeListButtonActionProps = {
  emptyTemplates: boolean;
  templatesLoaded: boolean;
  onClick: () => void;
};

const ServingRuntimeListButtonAction: React.FC<ServingRuntimeListButtonActionProps> = ({
  emptyTemplates,
  templatesLoaded,
  onClick,
}) => {
  if (emptyTemplates) {
    return (
      <Tooltip
        removeFindDomNode
        aria-label="Add Server Info"
        content={
          <Text>
            At least one serving runtime must be enabled to add a model server. Contact your
            administrator
          </Text>
        }
      >
        <Button
          isLoading={!templatesLoaded}
          isAriaDisabled={true}
          onClick={onClick}
          variant="secondary"
        >
          Add server
        </Button>
      </Tooltip>
    );
  }

  return (
    <Button
      isLoading={!templatesLoaded}
      isDisabled={!templatesLoaded}
      onClick={onClick}
      variant="secondary"
    >
      Add server
    </Button>
  );
};

export default ServingRuntimeListButtonAction;
