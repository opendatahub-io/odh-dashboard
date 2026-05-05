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
  FormGroup,
  InputGroup,
  InputGroupItem,
  Label,
  MenuToggle,
  MenuToggleElement,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalVariant,
  Select,
  SelectList,
  SelectOption,
  Spinner,
  TextInput,
  Tooltip,
} from '@patternfly/react-core';
import {
  CheckCircleIcon,
  CopyIcon,
  EyeIcon,
  EyeSlashIcon,
  InfoCircleIcon,
  TimesIcon,
} from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import { AIModel, SubscriptionInfo } from '~/app/types';
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

  // Get subscriptions from model data (included in /maas/models response)
  const subscriptions = React.useMemo(
    () => (isMaaS && model.subscriptions ? model.subscriptions : []),
    [isMaaS, model.subscriptions],
  );

  const [selectedSubscription, setSelectedSubscription] = React.useState<string>(
    subscriptions.length > 0 ? subscriptions[0].name : '',
  );
  const [isSubscriptionSelectOpen, setIsSubscriptionSelectOpen] = React.useState(false);
  const [isKeyVisible, setIsKeyVisible] = React.useState(false);
  const [isKeyCopied, setIsKeyCopied] = React.useState(false);
  const copyTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Update selected subscription when subscriptions change
  React.useEffect(() => {
    if (subscriptions.length > 0) {
      setSelectedSubscription(subscriptions[0].name);
    } else {
      setSelectedSubscription('');
    }
  }, [subscriptions]);

  // Cleanup timeout on unmount
  React.useEffect(
    () => () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    },
    [],
  );

  const selectedSubscriptionObj = subscriptions.find(
    (sub: SubscriptionInfo) => sub.name === selectedSubscription,
  );

  const handleEndpointCopy = (endpoint: string, endpointType: 'external' | 'internal') =>
    copyToClipboardWithTracking(endpoint, 'Available Endpoints Endpoint Copied', {
      assetType: isMaaS ? 'maas_model' : 'model',
      endpointType,
      copyTarget: 'endpoint',
      modelType: model.model_type === 'embedding' ? 'embedding' : 'inference',
      endpointSource: model.model_source_type,
    });

  const handleClose = () => {
    resetToken();
    setIsKeyVisible(false);
    setIsKeyCopied(false);
    onClose();
  };

  const handleClearKey = () => {
    resetToken();
    setIsKeyVisible(false);
    setIsKeyCopied(false);
  };

  const handleCopyKey = () => {
    if (tokenData) {
      copyToClipboardWithTracking(tokenData.key, 'Available Endpoints Service Token Copied', {
        assetType: 'maas_model',
        copyTarget: 'service_token',
      });
      setIsKeyCopied(true);
      // Clear any existing timeout to prevent multiple timers
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      copyTimeoutRef.current = setTimeout(() => {
        setIsKeyCopied(false);
      }, 2000);
    }
  };

  return (
    <Modal
      isOpen
      onClose={handleClose}
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

          {isMaaS && subscriptions.length > 0 && (
            <FlexItem>
              <Flex direction={{ default: 'column' }}>
                <FlexItem>
                  <Content
                    component={ContentVariants.p}
                    style={{ fontWeight: 'var(--pf-t--global--font--weight--body--bold)' }}
                  >
                    Authentication
                  </Content>
                </FlexItem>
                <FlexItem>
                  <Content component={ContentVariants.small}>
                    Select a subscription, then generate a temporary API key to authenticate
                    requests to this model.
                  </Content>
                </FlexItem>

                <FlexItem>
                  <Content
                    component={ContentVariants.p}
                    style={{ fontWeight: 'var(--pf-t--global--font--weight--body--bold)' }}
                  >
                    Subscription
                  </Content>
                </FlexItem>
                <FlexItem>
                  <FormGroup fieldId="subscription-select">
                    <Select
                      isOpen={isSubscriptionSelectOpen}
                      selected={selectedSubscription}
                      onSelect={(_event, value) => {
                        if (typeof value === 'string' && value !== selectedSubscription) {
                          setSelectedSubscription(value);
                          resetToken();
                          setIsKeyVisible(false);
                          setIsKeyCopied(false);
                        }
                        setIsSubscriptionSelectOpen(false);
                      }}
                      onOpenChange={(isOpen) => setIsSubscriptionSelectOpen(isOpen)}
                      toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
                        <MenuToggle
                          ref={toggleRef}
                          onClick={() => setIsSubscriptionSelectOpen(!isSubscriptionSelectOpen)}
                          isExpanded={isSubscriptionSelectOpen}
                          isFullWidth
                          data-testid="endpoint-modal-subscription-select"
                        >
                          {selectedSubscriptionObj?.displayName ||
                            selectedSubscriptionObj?.name ||
                            'Select a subscription'}
                        </MenuToggle>
                      )}
                    >
                      <SelectList>
                        {subscriptions.map((sub: SubscriptionInfo) => (
                          <SelectOption
                            key={sub.name}
                            value={sub.name}
                            description={
                              <span
                                style={{
                                  fontSize: 'var(--pf-t--global--font--size--body--sm)',
                                  color: 'var(--pf-t--global--text--color--subtle)',
                                }}
                              >
                                {sub.name}
                              </span>
                            }
                          >
                            {sub.displayName || sub.name}
                          </SelectOption>
                        ))}
                      </SelectList>
                    </Select>
                  </FormGroup>
                </FlexItem>

                <FlexItem>
                  <Content
                    component={ContentVariants.p}
                    style={{ fontWeight: 'var(--pf-t--global--font--weight--body--bold)' }}
                  >
                    API key
                  </Content>
                </FlexItem>

                {!tokenData ? (
                  <>
                    <FlexItem>
                      <Button
                        data-testid="endpoint-modal-generate-api-key"
                        variant={ButtonVariant.secondary}
                        isDisabled={isGenerating}
                        onClick={() => generateToken(undefined, selectedSubscription || undefined)}
                        icon={isGenerating ? <Spinner size="sm" /> : undefined}
                      >
                        Generate API key
                      </Button>
                    </FlexItem>

                    <FlexItem>
                      <Content component={ContentVariants.small}>
                        To create a permanent API key, visit the{' '}
                        <Link to={maasTokensPath}>API Keys</Link> page.
                      </Content>
                    </FlexItem>
                  </>
                ) : (
                  <>
                    <FlexItem>
                      <Alert
                        variant={AlertVariant.info}
                        title="This is an ephemeral API key"
                        isInline
                        customIcon={<InfoCircleIcon />}
                      >
                        This key expires in 1 hour and will not appear in your list of API keys. To
                        create a permanent key, visit the <Link to={maasTokensPath}>API Keys</Link>{' '}
                        page.
                      </Alert>
                    </FlexItem>
                    <FlexItem>
                      <InputGroup>
                        <InputGroupItem isFill>
                          <TextInput
                            type={isKeyVisible ? 'text' : 'password'}
                            value={tokenData.key}
                            readOnlyVariant="default"
                            aria-label="Generated MaaS API key"
                            data-testid="endpoint-modal-api-key-input"
                          />
                        </InputGroupItem>
                        <InputGroupItem>
                          <Tooltip content={isKeyVisible ? 'Hide key' : 'Show key'}>
                            <Button
                              variant={ButtonVariant.control}
                              onClick={() => setIsKeyVisible(!isKeyVisible)}
                              aria-label={isKeyVisible ? 'Hide key' : 'Show key'}
                              data-testid="endpoint-modal-api-key-toggle"
                            >
                              {isKeyVisible ? <EyeSlashIcon /> : <EyeIcon />}
                            </Button>
                          </Tooltip>
                        </InputGroupItem>
                        <InputGroupItem>
                          <Tooltip content={isKeyCopied ? 'Copied!' : 'Copy API key'}>
                            <Button
                              variant={ButtonVariant.control}
                              onClick={handleCopyKey}
                              aria-label="Copy API key"
                              data-testid="endpoint-modal-api-key-copy"
                            >
                              {isKeyCopied ? <CheckCircleIcon /> : <CopyIcon />}
                            </Button>
                          </Tooltip>
                        </InputGroupItem>
                        <InputGroupItem>
                          <Tooltip content="Clear key">
                            <Button
                              variant={ButtonVariant.control}
                              onClick={handleClearKey}
                              aria-label="Clear key"
                              data-testid="endpoint-modal-api-key-clear"
                            >
                              <TimesIcon />
                            </Button>
                          </Tooltip>
                        </InputGroupItem>
                      </InputGroup>
                    </FlexItem>
                  </>
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

          {isMaaS && subscriptions.length === 0 && (
            <FlexItem>
              <Alert
                variant={AlertVariant.info}
                title="No subscriptions available"
                isInline
                customIcon={<InfoCircleIcon />}
              >
                You don&apos;t have any subscriptions for this model. Contact your administrator to
                request access.
              </Alert>
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
