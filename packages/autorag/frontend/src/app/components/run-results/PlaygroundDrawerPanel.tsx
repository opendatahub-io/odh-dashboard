import {
  Bullseye,
  Button,
  Card,
  CardBody,
  ClipboardCopyButton,
  CodeBlock,
  CodeBlockAction,
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
  Spinner,
  Tab,
  Tabs,
  TabTitleText,
} from '@patternfly/react-core';
import { CodeIcon } from '@patternfly/react-icons';
import React from 'react';
import type { AutoragPattern, ResponsesTemplate } from '~/app/types/autoragPattern';
import { formatPatternName } from '~/app/utilities/utils';
import { generateCurlSnippet, generateGoSnippet, generateNodeSnippet } from './playgroundSnippets';

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
  const [activeCodeTab, setActiveCodeTab] = React.useState(0);
  const [copied, setCopied] = React.useState(false);

  const handleCopy = React.useCallback((text: string) => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

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
              <Flex
                alignItems={{ default: 'alignItemsCenter' }}
                spaceItems={{ default: 'spaceItemsSm' }}
              >
                <Button
                  variant="secondary"
                  icon={<CodeIcon />}
                  onClick={() => setIsViewCodeModalOpen(true)}
                  data-testid="playground-view-code-button"
                >
                  View Code
                </Button>
                <Label color="blue">Read-only</Label>
              </Flex>
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
            <React.Suspense
              fallback={
                <Bullseye>
                  <Spinner />
                </Bullseye>
              }
            >
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
        <ModalHeader title={`${formatPatternName(patternInfo.patternName)} — Response payload`} />
        <ModalBody style={{ height: '60vh' }}>
          <Content component={ContentVariants.p} className="pf-v6-u-mb-md">
            Use these code snippets to query this pattern programmatically via the Responses API.
            Replace <code>&lt;HOSTNAME&gt;</code> and <code>&lt;API_KEY&gt;</code> with your OGX
            instance URL and credentials.
          </Content>
          <Tabs
            activeKey={activeCodeTab}
            onSelect={(_e, key) => setActiveCodeTab(Number(key))}
            data-testid="view-code-tabs"
          >
            <Tab eventKey={0} title={<TabTitleText>curl</TabTitleText>}>
              <CodeBlock
                className="pf-v6-u-mt-md"
                style={{ maxHeight: '45vh', overflow: 'auto' }}
                actions={
                  <CodeBlockAction>
                    <ClipboardCopyButton
                      id="copy-curl"
                      aria-label="Copy curl snippet"
                      onClick={() => handleCopy(generateCurlSnippet(responsesTemplate))}
                      variant="plain"
                    >
                      {copied ? 'Copied' : 'Copy'}
                    </ClipboardCopyButton>
                  </CodeBlockAction>
                }
              >
                <CodeBlockCode>{generateCurlSnippet(responsesTemplate)}</CodeBlockCode>
              </CodeBlock>
            </Tab>
            <Tab eventKey={1} title={<TabTitleText>Node.js</TabTitleText>}>
              <CodeBlock
                className="pf-v6-u-mt-md"
                style={{ maxHeight: '45vh', overflow: 'auto' }}
                actions={
                  <CodeBlockAction>
                    <ClipboardCopyButton
                      id="copy-nodejs"
                      aria-label="Copy Node.js snippet"
                      onClick={() => handleCopy(generateNodeSnippet(responsesTemplate))}
                      variant="plain"
                    >
                      {copied ? 'Copied' : 'Copy'}
                    </ClipboardCopyButton>
                  </CodeBlockAction>
                }
              >
                <CodeBlockCode>{generateNodeSnippet(responsesTemplate)}</CodeBlockCode>
              </CodeBlock>
            </Tab>
            <Tab eventKey={2} title={<TabTitleText>Go</TabTitleText>}>
              <CodeBlock
                className="pf-v6-u-mt-md"
                style={{ maxHeight: '45vh', overflow: 'auto' }}
                actions={
                  <CodeBlockAction>
                    <ClipboardCopyButton
                      id="copy-go"
                      aria-label="Copy Go snippet"
                      onClick={() => handleCopy(generateGoSnippet(responsesTemplate))}
                      variant="plain"
                    >
                      {copied ? 'Copied' : 'Copy'}
                    </ClipboardCopyButton>
                  </CodeBlockAction>
                }
              >
                <CodeBlockCode>{generateGoSnippet(responsesTemplate)}</CodeBlockCode>
              </CodeBlock>
            </Tab>
          </Tabs>
        </ModalBody>
      </Modal>
    </>
  );
};

export default PlaygroundDrawerPanel;
export type { PlaygroundPatternInfo };
