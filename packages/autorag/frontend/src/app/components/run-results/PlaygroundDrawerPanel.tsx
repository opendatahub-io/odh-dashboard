import {
  Bullseye,
  Button,
  Card,
  CardBody,
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
  MenuToggle,
  Select,
  SelectList,
  SelectOption,
  Spinner,
} from '@patternfly/react-core';
import { CodeIcon } from '@patternfly/react-icons';
import React from 'react';
import type { ResponsesTemplate } from '~/app/types/autoragPattern';
import { useAutoragResultsContext } from '~/app/context/AutoragResultsContext';
import { formatPatternName } from '~/app/utilities/utils';
import './PlaygroundDrawerPanel.scss';

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
  responsesTemplate: ResponsesTemplate;
  patternInfo: PlaygroundPatternInfo;
  onClose: () => void;
  onSelectPattern: (patternName: string) => void;
  onViewCode: (patternName: string) => void;
};

const PlaygroundDrawerPanel: React.FC<PlaygroundDrawerPanelProps> = ({
  namespace,
  responsesTemplate,
  patternInfo,
  onClose,
  onSelectPattern,
  onViewCode,
}) => {
  const { parameters, patterns } = useAutoragResultsContext();
  const secretName = parameters?.ogx_secret_name ?? '';
  const [isPatternSelectOpen, setIsPatternSelectOpen] = React.useState(false);

  return (
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
                  className="autorag-playground-drawer__pattern-toggle"
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
                onClick={() => onViewCode(patternInfo.patternName)}
                data-testid="playground-view-code-button"
              >
                View Code
              </Button>
            </Flex>
          </FlexItem>
        </Flex>
        <DrawerActions>
          <DrawerCloseButton onClick={onClose} data-testid="playground-drawer-close" />
        </DrawerActions>
      </DrawerHead>
      <DrawerPanelBody hasNoPadding className="autorag-playground-drawer__panel-body">
        <div className="autorag-playground-drawer__info-section pf-v6-u-p-md">
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
            </CardBody>
          </Card>
        </div>
        <div className="autorag-playground-drawer__chatbot-container">
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
              placeholderBotContent=""
              welcomeContent={
                <Content
                  component={ContentVariants.p}
                  className="pf-v6-u-color-200 pf-v6-u-text-align-center"
                >
                  Ask a question about your documents to see how{' '}
                  {formatPatternName(patternInfo.patternName)} responds.
                </Content>
              }
            />
          </React.Suspense>
        </div>
      </DrawerPanelBody>
    </DrawerPanelContent>
  );
};

export default PlaygroundDrawerPanel;
export type { PlaygroundPatternInfo };
