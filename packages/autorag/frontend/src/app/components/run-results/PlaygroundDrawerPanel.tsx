import {
  Button,
  Card,
  CardBody,
  CodeBlock,
  CodeBlockCode,
  Content,
  ContentVariants,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  DrawerActions,
  DrawerCloseButton,
  DrawerHead,
  DrawerPanelBody,
  DrawerPanelContent,
  Flex,
  FlexItem,
  Label,
  MenuToggle,
  Modal,
  ModalBody,
  ModalHeader,
  Select,
  SelectList,
  SelectOption,
} from '@patternfly/react-core';
import { CodeIcon } from '@patternfly/react-icons';
import React from 'react';
import type { AutoragPattern, ResponsesTemplate } from '~/app/types/autoragPattern';
import { formatPatternName } from '~/app/utilities/utils';

const EmbeddedPlayground = React.lazy(() => import('~/app/components/EmbeddedPlayground'));

type PlaygroundPatternInfo = {
  patternName: string;
  modelId: string;
  optimizedMetricName: string;
  optimizedMetricValue: number | string;
  chunkMethod: string;
};

type PlaygroundDrawerPanelProps = {
  namespace: string;
  secretName: string;
  responsesTemplate: ResponsesTemplate;
  patternInfo: PlaygroundPatternInfo;
  patterns: Record<string, AutoragPattern>;
  onClose: () => void;
  onSelectPattern: (patternName: string) => void;
};

const PlaygroundDrawerPanel: React.FC<PlaygroundDrawerPanelProps> = ({
  namespace,
  secretName,
  responsesTemplate,
  patternInfo,
  patterns,
  onClose,
  onSelectPattern,
}) => {
  const [isPatternSelectOpen, setIsPatternSelectOpen] = React.useState(false);
  const [isViewCodeModalOpen, setIsViewCodeModalOpen] = React.useState(false);

  return (
    <>
      <DrawerPanelContent defaultSize="50%" minSize="400px" data-testid="playground-drawer-panel">
        <DrawerHead>
          <Flex
            justifyContent={{ default: 'justifyContentSpaceBetween' }}
            alignItems={{ default: 'alignItemsCenter' }}
          >
            <FlexItem>
              <Select
                isOpen={isPatternSelectOpen}
                onOpenChange={setIsPatternSelectOpen}
                onSelect={(_e, value) => {
                  if (typeof value === 'string') {
                    onSelectPattern(value);
                  }
                  setIsPatternSelectOpen(false);
                }}
                selected={patternInfo.patternName}
                toggle={(toggleRef) => (
                  <MenuToggle
                    ref={toggleRef}
                    onClick={() => setIsPatternSelectOpen((prev) => !prev)}
                    isExpanded={isPatternSelectOpen}
                    variant="plainText"
                    style={{ fontSize: 'var(--pf-t--global--font--size--heading--h2)' }}
                    data-testid="playground-pattern-select"
                  >
                    {formatPatternName(patternInfo.patternName)}
                  </MenuToggle>
                )}
              >
                <SelectList>
                  {Object.entries(patterns)
                    .filter(([, p]) => p.settings.responses_template)
                    .map(([name]) => (
                      <SelectOption key={name} value={name}>
                        {formatPatternName(name)}
                      </SelectOption>
                    ))}
                </SelectList>
              </Select>
            </FlexItem>
            <FlexItem>
              <Button
                variant="secondary"
                icon={<CodeIcon />}
                onClick={() => setIsViewCodeModalOpen(true)}
                data-testid="playground-view-code-button"
              >
                View Code
              </Button>
              <Label color="blue">Read-only</Label>
            </FlexItem>
          </Flex>
          <DrawerActions>
            <DrawerCloseButton onClick={onClose} data-testid="playground-drawer-close" />
          </DrawerActions>
        </DrawerHead>
        <DrawerPanelBody
          hasNoPadding
          style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
        >
          <div className="pf-v6-u-p-md" style={{ flexShrink: 0 }}>
            <Card isCompact>
              <CardBody>
                <DescriptionList isHorizontal isCompact columnModifier={{ default: '2Col' }}>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Pattern</DescriptionListTerm>
                    <DescriptionListDescription>
                      {formatPatternName(patternInfo.patternName)}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Model</DescriptionListTerm>
                    <DescriptionListDescription>{patternInfo.modelId}</DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>{patternInfo.optimizedMetricName}</DescriptionListTerm>
                    <DescriptionListDescription>
                      {typeof patternInfo.optimizedMetricValue === 'number'
                        ? patternInfo.optimizedMetricValue.toFixed(2)
                        : patternInfo.optimizedMetricValue}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                  <DescriptionListGroup>
                    <DescriptionListTerm>Chunk method</DescriptionListTerm>
                    <DescriptionListDescription>
                      {patternInfo.chunkMethod.charAt(0).toUpperCase() +
                        patternInfo.chunkMethod.slice(1)}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                </DescriptionList>
                <Content component={ContentVariants.small} className="pf-v6-u-mt-md">
                  This is a read-only evaluation. Ask questions to test this pattern&apos;s
                  responses and see which documents it retrieves.
                </Content>
              </CardBody>
            </Card>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <React.Suspense fallback={null}>
              <EmbeddedPlayground
                key={patternInfo.patternName}
                namespace={namespace}
                secretName={secretName}
                responsesTemplate={responsesTemplate}
                patternName={patternInfo.patternName}
                bffBasePath="/gen-ai/api/v1"
                placeholderBotContent={`Ask a question about your documents to see how ${formatPatternName(
                  patternInfo.patternName,
                )} responds.`}
                welcomeContent={<></>}
              />
            </React.Suspense>
          </div>
        </DrawerPanelBody>
      </DrawerPanelContent>
      <Modal
        isOpen={isViewCodeModalOpen}
        onClose={() => setIsViewCodeModalOpen(false)}
        variant="large"
        data-testid="playground-view-code-modal"
      >
        <ModalHeader title="Response payload" />
        <ModalBody>
          <CodeBlock>
            <CodeBlockCode>{JSON.stringify(responsesTemplate, null, 2)}</CodeBlockCode>
          </CodeBlock>
        </ModalBody>
      </Modal>
    </>
  );
};

export default PlaygroundDrawerPanel;
export type { PlaygroundPatternInfo };
