import * as React from 'react';
import { Button, ButtonVariant, ClipboardCopy, Label, Popover } from '@patternfly/react-core';
import { InfoCircleIcon } from '@patternfly/react-icons';
import { AIModel } from '~/app/types';

type AIModelsTableRowEndpointProps = {
  model: AIModel;
  isExternal?: boolean;
};

const AIModelsTableRowEndpoint: React.FC<AIModelsTableRowEndpointProps> = ({
  model,
  isExternal = false,
}) => {
  const endpoint = isExternal ? model.externalEndpoint : model.internalEndpoint;
  if (!endpoint) {
    return (
      <Popover
        bodyContent={
          <>
            No {isExternal ? 'external' : 'internal'} endpoint has been configured for this model.
          </>
        }
      >
        <Label icon={<InfoCircleIcon />}>Not available</Label>
      </Popover>
    );
  }
  return (
    <Popover
      position="right"
      headerContent={
        <div style={{ padding: '16px 16px 0 16px' }}>
          {isExternal ? 'External' : 'Internal'} Endpoint URL
        </div>
      }
      bodyContent={
        <div style={{ padding: '0 16px 16px 16px' }}>
          <ClipboardCopy
            hoverTip="Copy"
            clickTip="Copied"
            aria-label={`${isExternal ? 'external' : 'internal'} endpoint URL for ${model.model_name}`}
          >
            {endpoint}
          </ClipboardCopy>
        </div>
      }
    >
      <Button variant={ButtonVariant.link}>View</Button>
    </Popover>
  );
};

export default AIModelsTableRowEndpoint;
