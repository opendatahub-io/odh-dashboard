import * as React from 'react';
import { Button, Tooltip, Text } from '@patternfly/react-core';

type ServingRuntimeListButtonActionProps = {
  emptyTemplates: boolean;
  customServingRuntimesEnabled: boolean;
  templatesLoaded: boolean;
  onClick: () => void;
};

const ServingRuntimeListButtonAction: React.FC<ServingRuntimeListButtonActionProps> = ({
  emptyTemplates,
  customServingRuntimesEnabled,
  templatesLoaded,
  onClick,
}) => {
  if (emptyTemplates) {
    return (
      <Tooltip
        removeFindDomNode
        aria-label="Configure Server Info"
        content={
          <Text>
            At least one serving runtime must be enabled to configure a model server. Contact your
            administrator
          </Text>
        }
      >
        <Button
          isLoading={!templatesLoaded}
          isDisabled={true}
          onClick={onClick}
          variant="secondary"
        >
          Configure server
        </Button>
      </Tooltip>
    );
  }

  return (
    <Button
      isLoading={customServingRuntimesEnabled ? !templatesLoaded : false}
      onClick={onClick}
      variant="secondary"
    >
      Configure server
    </Button>
  );
};

export default ServingRuntimeListButtonAction;
