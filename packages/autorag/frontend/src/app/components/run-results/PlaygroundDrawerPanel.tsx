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
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Flex,
  FlexItem,
  MenuToggle,
  Select,
  SelectList,
  SelectOption,
  Spinner,
} from '@patternfly/react-core';
import { CodeIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import React from 'react';
import type { ResponsesTemplate } from '~/app/types/autoragPattern';
import { useAutoragResultsContext } from '~/app/context/AutoragResultsContext';
import { formatPatternName } from '~/app/utilities/utils';
import { formatMetricValue } from '~/app/utilities/metricUtils';
import {
  getPatternStoreProvider,
  isResponsesProvider,
  resolveDatabaseSecretName,
  resolveMaaSSecretName,
} from '~/app/utilities/responses';
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
  const secretName = resolveMaaSSecretName(parameters) ?? '';
  const [isPatternSelectOpen, setIsPatternSelectOpen] = React.useState(false);

  const databaseSecretName = resolveDatabaseSecretName(parameters);
  const provider = getPatternStoreProvider(patterns[patternInfo.patternName]);
  const responsesProviderSupported = isResponsesProvider(provider);
  const responsesReady = Boolean(databaseSecretName && secretName && responsesProviderSupported);
  const responsesEndpointUrl = React.useMemo(() => {
    if (!databaseSecretName || !secretName || !responsesProviderSupported) {
      return undefined;
    }

    const query = new URLSearchParams({ namespace });
    query.set('dbSecretName', databaseSecretName);
    if (secretName) {
      query.set('maasSecretName', secretName);
    }
    return `/autorag/api/v1/responses?${query.toString()}`;
  }, [databaseSecretName, namespace, responsesProviderSupported, secretName]);

  const additionalMetadata = React.useMemo(() => {
    const { settings } = patterns[patternInfo.patternName];
    return {
      /* eslint-disable camelcase */
      embedding_model: settings.embedding.model_id,
      system_message_text: settings.generation.system_message_text ?? '',
      context_template_text: settings.generation.context_template_text ?? '',
      user_message_text: settings.generation.user_message_text ?? '',
      /* eslint-enable camelcase */
    };
  }, [patterns, patternInfo.patternName]);

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
                {Object.entries(patterns).map(([name]) => (
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
              {responsesReady ? (
                <Button
                  variant="secondary"
                  icon={<CodeIcon />}
                  onClick={() => onViewCode(patternInfo.patternName)}
                  data-testid="playground-view-code-button"
                >
                  View Code
                </Button>
              ) : null}
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
                      ? formatMetricValue(patternInfo.optimizedMetricValue, 2)
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
          {responsesReady ? (
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
                responsesEndpointUrl={responsesEndpointUrl}
                additionalMetadata={additionalMetadata}
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
          ) : (
            <Bullseye>
              <EmptyState
                data-testid={
                  provider === 'neo4j'
                    ? 'playground-neo4j-unavailable'
                    : !databaseSecretName
                      ? 'playground-vector-db-unavailable'
                      : 'playground-maas-unavailable'
                }
                headingLevel="h2"
                icon={ExclamationCircleIcon}
                titleText={
                  provider === 'neo4j'
                    ? 'GraphRAG playground unavailable'
                    : !databaseSecretName
                      ? 'Playground unavailable'
                      : 'MaaS connection unavailable'
                }
                variant={EmptyStateVariant.sm}
                status="warning"
              >
                <EmptyStateBody>
                  {provider === 'neo4j'
                    ? 'GraphRAG runs using Neo4j are not supported by the Responses playground. Use the run results and pattern details instead.'
                    : !databaseSecretName
                      ? 'The database connection is unavailable for this historical run. Rerun or configure the run with its database connection to use the playground.'
                      : 'A MaaS connection is required to use the playground. Configure the run with a MaaS secret and try again.'}
                </EmptyStateBody>
              </EmptyState>
            </Bullseye>
          )}
        </div>
      </DrawerPanelBody>
    </DrawerPanelContent>
  );
};

export default PlaygroundDrawerPanel;
export type { PlaygroundPatternInfo };
