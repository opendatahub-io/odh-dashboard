import * as React from 'react';
import {
  Button,
  Truncate,
  Label,
  Popover,
  ClipboardCopy,
  ButtonVariant,
  Content,
  Flex,
  FlexItem,
  ContentVariants,
} from '@patternfly/react-core';
import { Td, Tr } from '@patternfly/react-table';
import { CheckCircleIcon, PlusCircleIcon, InfoCircleIcon } from '@patternfly/react-icons';
import { TableRowTitleDescription } from 'mod-arch-shared';
import { AIModel } from '~/app/types';

type AIModelTableRowProps = {
  model: AIModel;
  onTryInPlayground: (model: AIModel) => void;
};

const AIModelTableRow: React.FC<AIModelTableRowProps> = ({ model, onTryInPlayground }) => (
  <Tr>
    <Td dataLabel="Model deployment name">
      <TableRowTitleDescription
        title={
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {model.model_name}
            <Popover
              position="right"
              bodyContent={
                <Flex>
                  <FlexItem>
                    <Content component={ContentVariants.small}>
                      Resource names and types are used to find your resources in OpenShift.
                    </Content>
                  </FlexItem>
                  <FlexItem>
                    <Flex>
                      <FlexItem>
                        <Content
                          style={{ fontWeight: 'var(--pf-t--global--font--weight--body--bold)' }}
                        >
                          Resource name
                        </Content>
                      </FlexItem>
                      <FlexItem>
                        <ClipboardCopy
                          hoverTip="Copy"
                          clickTip="Copied"
                          style={{ fontFamily: 'monospace' }}
                          aria-label={`Resource name for ${model.model_name}`}
                        >
                          {model.model_name}
                        </ClipboardCopy>
                      </FlexItem>
                    </Flex>
                  </FlexItem>
                  <FlexItem>
                    <Flex direction={{ default: 'column' }}>
                      <FlexItem>
                        <Content
                          style={{ fontWeight: 'var(--pf-t--global--font--weight--body--bold)' }}
                        >
                          Resource type
                        </Content>
                      </FlexItem>
                      <FlexItem>
                        <Content style={{ color: 'var(--pf-t--global--text--color--subtle)' }}>
                          InferenceService
                        </Content>
                      </FlexItem>
                    </Flex>
                  </FlexItem>
                </Flex>
              }
            >
              <Button
                variant={ButtonVariant.plain}
                aria-label={`Resource information for ${model.model_name}`}
              >
                <InfoCircleIcon />
              </Button>
            </Popover>
          </div>
        }
        description={model.description}
      />
    </Td>
    <Td dataLabel="Internal endpoint">
      {model.internalEndpoint ? (
        <Popover
          position="right"
          headerContent={
            <div style={{ padding: '16px 16px 0 16px' }}>
              <div style={{ margin: 0, fontSize: 'var(--pf-t--global--font--size--h3)' }}>
                Internal Endpoint URL
              </div>
            </div>
          }
          bodyContent={
            <div style={{ padding: '0 16px 16px 16px' }}>
              <ClipboardCopy
                hoverTip="Copy"
                clickTip="Copied"
                aria-label={`Internal endpoint URL for ${model.model_name}`}
              >
                {model.internalEndpoint}
              </ClipboardCopy>
            </div>
          }
        >
          <Button variant={ButtonVariant.link}>View</Button>
        </Popover>
      ) : (
        '—'
      )}
    </Td>
    <Td dataLabel="External endpoint">
      {model.externalEndpoint ? (
        <Popover
          position="right"
          headerContent={
            <div style={{ padding: '16px 16px 0 16px' }}>
              <div style={{ margin: 0, fontSize: 'var(--pf-t--global--font--size--h3)' }}>
                External Endpoint URL
              </div>
            </div>
          }
          bodyContent={
            <div style={{ padding: '0 16px 16px 16px' }}>
              <ClipboardCopy
                hoverTip="Copy"
                clickTip="Copied"
                style={{ fontFamily: 'monospace' }}
                aria-label={`External endpoint URL for ${model.model_name}`}
              >
                {model.externalEndpoint}
              </ClipboardCopy>
            </div>
          }
        >
          <Button variant={ButtonVariant.link}>View</Button>
        </Popover>
      ) : (
        '—'
      )}
    </Td>
    <Td dataLabel="Use Case">
      <Truncate content={model.usecase} />
    </Td>
    <Td dataLabel="Status">
      <Label color="green" icon={<CheckCircleIcon />}>
        Active
      </Label>
    </Td>
    <Td dataLabel="Playground">
      {model.playgroundStatus === 'available' ? (
        <Button variant={ButtonVariant.secondary} onClick={() => onTryInPlayground(model)}>
          Try in playground
        </Button>
      ) : (
        <Button variant={ButtonVariant.link} icon={<PlusCircleIcon />} isDisabled>
          Add to playground
        </Button>
      )}
    </Td>
  </Tr>
);

export default AIModelTableRow;
