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
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
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
        aria-label={`No ${isExternal ? 'external' : 'internal'} endpoint for ${model.model_name}`}
        bodyContent={
          <>
            No {isExternal ? 'external' : 'internal'} endpoint has been configured for this model
            deployment.
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
      aria-label={`${isExternal ? 'external' : 'internal'} endpoint URL for ${model.model_name}`}
      bodyContent={
        <Flex>
          <FlexItem>
            <Flex>
              <FlexItem>
                <Content style={{ fontWeight: 'var(--pf-t--global--font--weight--body--bold)' }}>
                  {isExternal ? 'External' : 'Internal'} endpoint URL
                </Content>
              </FlexItem>
              <FlexItem>
                <ClipboardCopy
                  hoverTip="Copy URL"
                  clickTip="Copied"
                  aria-label={`${isExternal ? 'external' : 'internal'} endpoint URL for ${model.model_name}`}
                  onCopy={() => {
                    fireMiscTrackingEvent('Endpoint_Copied', {
                      // eslint-disable-next-line camelcase
                      asset_type: 'model',
                      // eslint-disable-next-line camelcase
                      endpoint_type: isExternal ? 'external' : 'internal',
                      // eslint-disable-next-line camelcase
                      copy_target: 'endpoint',
                    });
                  }}
                >
                  {endpoint}
                </ClipboardCopy>
              </FlexItem>
            </Flex>
          </FlexItem>
          {isExternal && model.sa_token.token && (
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
                    onCopy={() => {
                      fireMiscTrackingEvent('Service_Token_Copied', {
                        // eslint-disable-next-line camelcase
                        asset_type: 'model',
                        // eslint-disable-next-line camelcase
                        copy_target: 'service_token',
                      });
                    }}
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
      <Button variant={ButtonVariant.link}>View URL</Button>
    </Popover>
  );
};

export default AIModelsTableRowEndpoint;
