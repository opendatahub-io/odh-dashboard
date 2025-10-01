import * as React from 'react';
import {
  Button,
  ButtonVariant,
  ClipboardCopy,
  Content,
  Flex,
  FlexItem,
  Label,
  Popover,
} from '@patternfly/react-core';
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
      bodyContent={
        <Flex>
          <FlexItem>
            <Flex>
              <FlexItem>
                <Content style={{ fontWeight: 'var(--pf-t--global--font--weight--body--bold)' }}>
                  {isExternal ? 'External' : 'Internal'} Endpoint URL
                </Content>
              </FlexItem>
              <FlexItem>
                <ClipboardCopy
                  hoverTip="Copy"
                  clickTip="Copied"
                  aria-label={`${isExternal ? 'external' : 'internal'} endpoint URL for ${model.model_name}`}
                >
                  {endpoint}
                </ClipboardCopy>
              </FlexItem>
            </Flex>
          </FlexItem>
          {isExternal && (
            <FlexItem>
              <Flex direction={{ default: 'column' }}>
                <FlexItem>
                  <Content style={{ fontWeight: 'var(--pf-t--global--font--weight--body--bold)' }}>
                    API token
                  </Content>
                </FlexItem>
                <FlexItem>
                  <ClipboardCopy
                    hoverTip="Copy"
                    clickTip="Copied"
                    aria-label={`External endpoint API token for ${model.model_name}`}
                  >
                    {model.sa_token.token}
                  </ClipboardCopy>
                </FlexItem>
              </Flex>
            </FlexItem>
          )}
        </Flex>
      }
    >
      <Button variant={ButtonVariant.link}>View</Button>
    </Popover>
  );
};

export default AIModelsTableRowEndpoint;
