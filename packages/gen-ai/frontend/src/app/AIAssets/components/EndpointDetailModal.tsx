import * as React from 'react';
import {
  ClipboardCopy,
  ClipboardCopyButton,
  CodeBlock,
  CodeBlockAction,
  CodeBlockCode,
  Content,
  ContentVariants,
  ExpandableSection,
  Flex,
  FlexItem,
  Label,
  Modal,
  ModalBody,
  ModalHeader,
  ModalVariant,
} from '@patternfly/react-core';
import { Table, Tbody, Td, Th, Thead, Tr } from '@patternfly/react-table';
import { Link } from 'react-router-dom';
import { AIModel } from '~/app/types';
import { maasTokensPath } from '~/app/utilities/routes';
import { copyToClipboardWithTracking } from '~/app/utilities/utils';

type EndpointDetailModalProps = {
  model: AIModel;
  onClose: () => void;
};

export const buildModelUsageExample = (
  baseURL: string | undefined,
  modelID: string,
  modelType: AIModel['model_type'],
  authenticationType: 'apiKey' | 'openshiftToken',
): string => {
  if (!baseURL) {
    return '';
  }

  try {
    const requestURL = new URL(baseURL);
    if (requestURL.protocol !== 'http:' && requestURL.protocol !== 'https:') {
      return '';
    }

    const isEmbedding = modelType === 'embedding';
    const isTranscription = modelType === 'transcription';
    requestURL.search = '';
    requestURL.hash = '';
    const basePath = requestURL.pathname.replace(/\/$/, '');
    const apiVersionPath = basePath.endsWith('/v1') ? basePath : `${basePath}/v1`;
    requestURL.pathname = `${apiVersionPath}/${
      isEmbedding ? 'embeddings' : isTranscription ? 'audio/transcriptions' : 'chat/completions'
    }`;

    const requestBody = isEmbedding
      ? { model: modelID, input: 'Hello, world!' }
      : { model: modelID, messages: [{ role: 'user', content: 'Hello, world!' }] };
    const shellSafeURL = requestURL.toString().replaceAll("'", "'\"'\"'");
    const shellSafeBody = JSON.stringify(requestBody).replaceAll("'", "'\"'\"'");

    const authenticationLines =
      authenticationType === 'apiKey'
        ? ['export API_KEY="<your-api-key>"', '', '  -H "Authorization: Bearer $API_KEY" \\']
        : ['export TOKEN="<your-openshift-token>"', '', '  -H "Authorization: Bearer $TOKEN" \\'];

    const requestLines = isTranscription
      ? [
          `curl -X POST '${shellSafeURL}' \\`,
          ...authenticationLines.slice(2),
          '  -F "file=@<path-to-audio-file>" \\',
          `  -F "model=${modelID}"`,
        ]
      : [
          `curl -X POST '${shellSafeURL}' \\`,
          '  -H "Content-Type: application/json" \\',
          ...authenticationLines.slice(2),
          `  -d '${shellSafeBody}'`,
        ];

    return [...authenticationLines.slice(0, 2), ...requestLines].join('\n');
  } catch {
    return '';
  }
};

export const getBaseURLEndpointType = (
  baseURL: string | undefined,
  internalEndpoint: string | undefined,
): 'external' | 'internal' => (baseURL === internalEndpoint ? 'internal' : 'external');

const EndpointDetailModal: React.FC<EndpointDetailModalProps> = ({ model, onClose }) => {
  const hasExternal = !!model.externalEndpoint;
  const hasInternal = !!model.internalEndpoint;
  const isMaaS = model.model_source_type === 'maas';
  const isCustomEndpoint = model.model_source_type === 'custom_endpoint';
  const isNamespaceModel = model.model_source_type === 'namespace';
  const showConnectionDetails = isMaaS || isCustomEndpoint || isNamespaceModel;
  const subscriptions = isMaaS ? (model.subscriptions ?? []) : [];
  const [isSubscriptionsExpanded, setIsSubscriptionsExpanded] = React.useState(false);
  const modelID = model.id ?? model.model_id;
  const baseURL = model.externalEndpoint ?? model.internalEndpoint;
  const internalBaseURL =
    isNamespaceModel && model.internalEndpoint && model.internalEndpoint !== baseURL
      ? model.internalEndpoint
      : undefined;
  const baseURLEndpointType = getBaseURLEndpointType(baseURL, model.internalEndpoint);
  const usageExample = showConnectionDetails
    ? buildModelUsageExample(
        baseURL,
        modelID,
        model.model_type,
        isNamespaceModel ? 'openshiftToken' : 'apiKey',
      )
    : '';

  const handleEndpointCopy = (endpoint: string, endpointType: 'external' | 'internal') =>
    copyToClipboardWithTracking(endpoint, 'Available Endpoints Endpoint Copied', {
      assetType: isMaaS ? 'maas_model' : 'model',
      endpointType,
      copyTarget: 'endpoint',
      modelType: model.model_type || 'inference',
      endpointSource: model.model_source_type,
    });

  return (
    <Modal
      isOpen
      onClose={onClose}
      variant={ModalVariant.medium}
      aria-label="Endpoints"
      data-testid="endpoint-detail-modal"
    >
      <ModalHeader
        title={
          <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
            <FlexItem>Endpoints</FlexItem>
            {isMaaS && (
              <FlexItem>
                <Label color="blue">Model as a Service</Label>
              </FlexItem>
            )}
          </Flex>
        }
      />
      <ModalBody>
        <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsLg' }}>
          <FlexItem>
            <Content component={ContentVariants.p}>
              Use the following URL endpoints to connect this model to your application.
            </Content>
          </FlexItem>

          {showConnectionDetails && baseURL && (
            <FlexItem>
              <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
                <FlexItem>
                  <Content
                    component={ContentVariants.p}
                    style={{ fontWeight: 'var(--pf-t--global--font--weight--body--bold)' }}
                  >
                    Base URL
                  </Content>
                </FlexItem>
                <FlexItem>
                  <ClipboardCopy
                    isReadOnly
                    data-testid="endpoint-modal-base-url"
                    hoverTip="Copy URL"
                    clickTip="Copied"
                    aria-label={`Base URL for ${model.model_name}`}
                    onCopy={() => handleEndpointCopy(baseURL, baseURLEndpointType)}
                  >
                    {baseURL}
                  </ClipboardCopy>
                </FlexItem>
                <FlexItem>
                  <Content
                    component={ContentVariants.small}
                    style={{ color: 'var(--pf-t--global--text--color--subtle)' }}
                  >
                    {isMaaS
                      ? 'Use this base URL for requests to MaaS models.'
                      : 'Use this base URL for requests to the model. Internal endpoints must be accessed from within the cluster.'}
                  </Content>
                </FlexItem>
              </Flex>
            </FlexItem>
          )}

          {showConnectionDetails && internalBaseURL && (
            <FlexItem>
              <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
                <FlexItem>
                  <Content
                    component={ContentVariants.p}
                    style={{ fontWeight: 'var(--pf-t--global--font--weight--body--bold)' }}
                  >
                    Internal Base URL
                  </Content>
                </FlexItem>
                <FlexItem>
                  <ClipboardCopy
                    isReadOnly
                    data-testid="endpoint-modal-internal-base-url"
                    hoverTip="Copy URL"
                    clickTip="Copied"
                    aria-label={`Internal Base URL for ${model.model_name}`}
                    onCopy={() => handleEndpointCopy(internalBaseURL, 'internal')}
                  >
                    {internalBaseURL}
                  </ClipboardCopy>
                </FlexItem>
                <FlexItem>
                  <Content
                    component={ContentVariants.small}
                    style={{ color: 'var(--pf-t--global--text--color--subtle)' }}
                  >
                    Internal endpoints must be accessed from within the cluster.
                  </Content>
                </FlexItem>
              </Flex>
            </FlexItem>
          )}

          {!showConnectionDetails && hasExternal && (
            <FlexItem>
              <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
                <FlexItem>
                  <Content
                    component={ContentVariants.p}
                    style={{ fontWeight: 'var(--pf-t--global--font--weight--body--bold)' }}
                  >
                    External API endpoint
                  </Content>
                </FlexItem>
                <FlexItem>
                  <ClipboardCopy
                    isReadOnly
                    data-testid="endpoint-modal-external-url"
                    hoverTip="Copy URL"
                    clickTip="Copied"
                    aria-label={`External API endpoint URL for ${model.model_name}`}
                    onCopy={() => handleEndpointCopy(model.externalEndpoint ?? '', 'external')}
                  >
                    {model.externalEndpoint ?? ''}
                  </ClipboardCopy>
                </FlexItem>
                <FlexItem>
                  <Content
                    component={ContentVariants.small}
                    style={{ color: 'var(--pf-t--global--text--color--subtle)' }}
                  >
                    Use this endpoint to access the model from outside the cluster.
                  </Content>
                </FlexItem>
              </Flex>
            </FlexItem>
          )}

          {!showConnectionDetails && hasInternal && (
            <FlexItem>
              <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
                <FlexItem>
                  <Content
                    component={ContentVariants.p}
                    style={{ fontWeight: 'var(--pf-t--global--font--weight--body--bold)' }}
                  >
                    Internal API endpoint
                  </Content>
                </FlexItem>
                <FlexItem>
                  <ClipboardCopy
                    isReadOnly
                    data-testid="endpoint-modal-internal-url"
                    hoverTip="Copy URL"
                    clickTip="Copied"
                    aria-label={`Internal API endpoint URL for ${model.model_name}`}
                    onCopy={() => handleEndpointCopy(model.internalEndpoint ?? '', 'internal')}
                  >
                    {model.internalEndpoint ?? ''}
                  </ClipboardCopy>
                </FlexItem>
                <FlexItem>
                  <Content
                    component={ContentVariants.small}
                    style={{ color: 'var(--pf-t--global--text--color--subtle)' }}
                  >
                    Use this endpoint to access the model from within the cluster.
                  </Content>
                </FlexItem>
              </Flex>
            </FlexItem>
          )}

          {showConnectionDetails && (
            <FlexItem>
              <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
                <FlexItem>
                  <Content
                    component={ContentVariants.p}
                    style={{ fontWeight: 'var(--pf-t--global--font--weight--body--bold)' }}
                  >
                    Model ID
                  </Content>
                </FlexItem>
                <FlexItem>
                  <ClipboardCopy
                    isReadOnly
                    isCode
                    data-testid="endpoint-modal-model-id"
                    hoverTip="Copy model ID"
                    clickTip="Copied"
                    aria-label={`Model ID for ${model.model_name}`}
                  >
                    {modelID}
                  </ClipboardCopy>
                </FlexItem>
                <FlexItem>
                  <Content
                    component={ContentVariants.small}
                    style={{ color: 'var(--pf-t--global--text--color--subtle)' }}
                  >
                    Use this exact identifier in the <code>model</code> field of your API request.
                  </Content>
                </FlexItem>
              </Flex>
            </FlexItem>
          )}

          {showConnectionDetails && usageExample && (
            <FlexItem>
              <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
                <FlexItem>
                  <Content
                    component={ContentVariants.p}
                    style={{ fontWeight: 'var(--pf-t--global--font--weight--body--bold)' }}
                  >
                    Usage example
                  </Content>
                </FlexItem>
                <FlexItem>
                  <CodeBlock
                    actions={
                      <CodeBlockAction>
                        <ClipboardCopyButton
                          id={`model-${modelID}-usage-example-copy`}
                          aria-label="Copy usage example"
                          onClick={() =>
                            void navigator.clipboard.writeText(usageExample).catch(() => undefined)
                          }
                          variant="plain"
                        >
                          Copy
                        </ClipboardCopyButton>
                      </CodeBlockAction>
                    }
                  >
                    <CodeBlockCode>{usageExample}</CodeBlockCode>
                  </CodeBlock>
                </FlexItem>
                <FlexItem>
                  <Content
                    component={ContentVariants.small}
                    style={{ color: 'var(--pf-t--global--text--color--subtle)' }}
                  >
                    {isNamespaceModel ? (
                      <>
                        Set <code>TOKEN</code> to an OpenShift token before running this command.
                      </>
                    ) : (
                      <>
                        Set <code>API_KEY</code> to an existing API key before running this command.
                      </>
                    )}
                  </Content>
                </FlexItem>
              </Flex>
            </FlexItem>
          )}

          {showConnectionDetails && (
            <FlexItem>
              <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
                <FlexItem>
                  <Content
                    component={ContentVariants.p}
                    style={{ fontWeight: 'var(--pf-t--global--font--weight--body--bold)' }}
                  >
                    Authentication
                  </Content>
                </FlexItem>
                <FlexItem>
                  {isMaaS ? (
                    <Content component={ContentVariants.small}>
                      To authenticate requests to this model, use an existing API key or create a
                      new one from the <Link to={maasTokensPath}>API keys</Link> page. The API key
                      must be scoped to a subscription that includes this model.
                    </Content>
                  ) : isCustomEndpoint ? (
                    <Content component={ContentVariants.small}>
                      Use the API key for the underlying model that was provided when this endpoint
                      was created.
                    </Content>
                  ) : (
                    <Content component={ContentVariants.small}>
                      Use an OpenShift token to authenticate requests to this model.
                    </Content>
                  )}
                </FlexItem>
                {subscriptions.length > 0 && (
                  <FlexItem>
                    <ExpandableSection
                      toggleText="View subscriptions"
                      isExpanded={isSubscriptionsExpanded}
                      onToggle={(_event, expanded) => setIsSubscriptionsExpanded(expanded)}
                    >
                      <Table
                        aria-label="Available subscriptions"
                        variant="compact"
                        data-testid="endpoint-modal-subscriptions-table"
                      >
                        <Thead>
                          <Tr>
                            <Th>Subscription</Th>
                            <Th>Description</Th>
                          </Tr>
                        </Thead>
                        <Tbody>
                          {subscriptions.map((subscription) => (
                            <Tr key={subscription.name}>
                              <Td dataLabel="Subscription">
                                <Link
                                  to={`/maas/maas-governance/subscriptions/view/${encodeURIComponent(subscription.name)}`}
                                >
                                  {subscription.displayName ?? subscription.name}
                                </Link>
                                {subscription.displayName &&
                                  subscription.displayName !== subscription.name && (
                                    <Content component={ContentVariants.small}>
                                      {subscription.name}
                                    </Content>
                                  )}
                              </Td>
                              <Td dataLabel="Description">{subscription.description ?? '-'}</Td>
                            </Tr>
                          ))}
                        </Tbody>
                      </Table>
                    </ExpandableSection>
                  </FlexItem>
                )}
              </Flex>
            </FlexItem>
          )}
        </Flex>
      </ModalBody>
    </Modal>
  );
};

export default EndpointDetailModal;
