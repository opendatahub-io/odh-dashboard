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
}) => (
  <Tooltip
    removeFindDomNode
    aria-label="Add Server Info"
    content={
      <Text>
        {emptyTemplates
          ? 'At least one serving runtime must be enabled to add a model server. Contact your administrator.'
          : 'A model server specifies resources available for use by one or more supported models, and includes a serving runtime.'}
      </Text>
    }
  >
    <Button
      isLoading={!templatesLoaded}
      isAriaDisabled={emptyTemplates}
      isDisabled={!templatesLoaded}
      onClick={onClick}
      variant="secondary"
    >
      Add model server
    </Button>
  </Tooltip>
);

export default ServingRuntimeListButtonAction;
