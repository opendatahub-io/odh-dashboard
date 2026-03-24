import * as React from 'react';
import {
  Alert,
  AlertVariant,
  Button,
  ButtonVariant,
  ClipboardCopy,
  Content,
  ContentVariants,
  Flex,
  FlexItem,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Spinner,
} from '@patternfly/react-core';
import { InfoCircleIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import { AIModel } from '~/app/types';
import useGenerateMaaSToken from '~/app/hooks/useGenerateMaaSToken';
import { copyToClipboardWithTracking } from '~/app/utilities/utils';
import { maasTokensPath } from '~/app/utilities/routes';

type EndpointDetailModalProps = {
  model: AIModel;
  onClose: () => void;
};

const EndpointDetailModal: React.FC<EndpointDetailModalProps> = ({ model, onClose }) => {
  const hasExternal = !!model.externalEndpoint;
  const hasInternal = !!model.internalEndpoint;
  const isMaaS = model.model_source_type === 'maas';

  const { isGenerating, tokenData, error, generateToken, resetToken } = useGenerateMaaSToken();

  const handleEndpointCopy = (endpoint: string, endpointType: 'external' | 'internal') =>
    copyToClipboardWithTracking(endpoint, 'Available Endpoints Endpoint Copied', {
      assetType: isMaaS ? 'maas_model' : 'model',
      endpointType,
      copyTarget: 'endpoint',
    });

  const handleClose = () => {
    resetToken();
    onClose();
  };

  return (
    <Modal isOpen onClose={handleClose} variant={ModalVariant.medium} aria-label="Endpoints">
      <ModalHeader
        title={
          <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
            <FlexItem>Endpoints</FlexItem>
            {isMaaS && (
              <FlexItem>
                <Label color="blue" isCompact>
                  Model as a Service
                </Label>
              </FlexItem>
            )}
          </Flex>
        }
      />
      <ModalBody>
        <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsLg' }}>
          {isMaaS && (
            <FlexItem>
              <Content component={ContentVariants.p}>
                The underlying model is managed by a cluster administrator and shared across
                projects via the API gateway. Use this endpoint to connect your application to this
                model. Copy the endpoint URL below to start making requests.
              </Content>
            </FlexItem>
          )}
          {!isMaaS && (
            <FlexItem>
              <Content component={ContentVariants.p}>
                Use this endpoint to connect your application to this model. Copy the endpoint URL
                below along with the authentication details to start making requests.
              </Content>
            </FlexItem>
          )}

          {hasExternal && (
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

          {hasInternal && (
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

          {isMaaS && (
            <FlexItem>
              <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
                <FlexItem>
                  <Content
                    component={ContentVariants.p}
                    style={{ fontWeight: 'var(--pf-t--global--font--weight--body--bold)' }}
                  >
                    API token
                  </Content>
                </FlexItem>

                {!tokenData && (
                  <FlexItem>
                    <Button
                      data-testid="endpoint-modal-generate-api-key"
                      variant={ButtonVariant.secondary}
                      isDisabled={isGenerating}
                      onClick={() => generateToken()}
                      icon={isGenerating ? <Spinner size="sm" /> : undefined}
                    >
                      Generate API token
                    </Button>
                  </FlexItem>
                )}

                <FlexItem>
                  <Content component={ContentVariants.small}>
                    Or use any of your <Link to={maasTokensPath}>existing API keys</Link> to
                    authenticate requests to this model.
                  </Content>
                </FlexItem>

                {tokenData && (
                  <FlexItem>
                    <Flex
                      direction={{ default: 'column' }}
                      spaceItems={{ default: 'spaceItemsSm' }}
                    >
                      <FlexItem>
                        <Alert
                          variant={AlertVariant.info}
                          title="Important: Copy and store this token"
                          isInline
                          customIcon={<InfoCircleIcon />}
                        >
                          This token can be viewed only once, and will be unavailable after you
                          close this dialog.
                        </Alert>
                      </FlexItem>
                      <FlexItem>
                        <ClipboardCopy
                          data-testid="endpoint-modal-api-key-copy"
                          hoverTip="Copy"
                          clickTip="Copied"
                          aria-label="Generated MaaS API key"
                          onCopy={() =>
                            copyToClipboardWithTracking(
                              tokenData.key,
                              'Available Endpoints Service Token Copied',
                              {
                                assetType: 'maas_model',
                                copyTarget: 'service_token',
                              },
                            )
                          }
                        >
                          {tokenData.key}
                        </ClipboardCopy>
                      </FlexItem>
                    </Flex>
                  </FlexItem>
                )}

                {error && (
                  <FlexItem>
                    <Alert variant={AlertVariant.danger} title="Error generating API key" isInline>
                      {error}
                    </Alert>
                  </FlexItem>
                )}
              </Flex>
            </FlexItem>
          )}
        </Flex>
      </ModalBody>
      <ModalFooter>
        <Button
          data-testid="endpoint-modal-close"
          variant={ButtonVariant.primary}
          onClick={handleClose}
        >
          Close
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default EndpointDetailModal;
