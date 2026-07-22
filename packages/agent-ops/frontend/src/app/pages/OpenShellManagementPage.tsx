import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  CardTitle,
  Content,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Flex,
  FlexItem,
  Gallery,
  GalleryItem,
  Label,
  PageSection,
  Spinner,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { PlusCircleIcon } from '@patternfly/react-icons';
import { useGatewayContext } from '~/app/context/GatewayContext';
import type { Gateway } from '~/app/types/gateway';
import CreateGatewayModal from '~/app/components/CreateGatewayModal';
import GatewayDeleteModal from '~/app/components/GatewayDeleteModal';
import ManageProvidersModal from '~/app/components/ManageProvidersModal';

const gatewayStatusColor = (status: Gateway['status']): 'green' | 'red' | 'grey' => {
  switch (status) {
    case 'healthy':
      return 'green';
    case 'unhealthy':
      return 'red';
    default:
      return 'grey';
  }
};

const OpenShellManagementPage: React.FC = () => {
  const navigate = useNavigate();
  const { gateways, loaded: gatewaysLoaded, refresh: refreshGateways } = useGatewayContext();

  const [isCreateGatewayOpen, setIsCreateGatewayOpen] = React.useState(false);
  const [createGatewayDeployMode, setCreateGatewayDeployMode] = React.useState(false);
  const [gatewayToDelete, setGatewayToDelete] = React.useState<Gateway | undefined>();
  const [gatewayForProviders, setGatewayForProviders] = React.useState<Gateway | undefined>();

  return (
    <>
      <PageSection hasBodyWrapper={false}>
        <Stack hasGutter>
          <StackItem>
            <Breadcrumb>
              <BreadcrumbItem
                onClick={() => navigate('/ai-hub/agents/deployments')}
                data-testid="breadcrumb-agents"
              >
                Agents
              </BreadcrumbItem>
              <BreadcrumbItem isActive>OpenShell</BreadcrumbItem>
            </Breadcrumb>
          </StackItem>
          <StackItem>
            <Title headingLevel="h1">OpenShell Management</Title>
            <Content component="p">
              Manage gateways and provider profiles. Gateways are shared infrastructure available to
              all projects.
            </Content>
          </StackItem>

          <StackItem>
            <Title headingLevel="h2">Gateways</Title>
          </StackItem>
          <StackItem>
            {!gatewaysLoaded ? (
              <Spinner aria-label="Loading gateways" />
            ) : gateways.length === 0 ? (
              <EmptyState
                headingLevel="h3"
                titleText="No gateways"
                variant={EmptyStateVariant.sm}
                data-testid="no-gateways-empty"
              >
                <EmptyStateBody>
                  No OpenShell gateways found. Register an existing gateway or deploy a new one.
                </EmptyStateBody>
                <Button
                  variant="primary"
                  onClick={() => {
                    setCreateGatewayDeployMode(true);
                    setIsCreateGatewayOpen(true);
                  }}
                  data-testid="deploy-first-gateway"
                >
                  Deploy gateway
                </Button>
              </EmptyState>
            ) : (
              <Gallery hasGutter minWidths={{ default: '280px' }} data-testid="gateway-cards">
                {gateways.map((gw) => (
                  <GalleryItem key={gw.name}>
                    <Card isCompact data-testid={`gateway-card-${gw.name}`}>
                      <CardHeader>
                        <CardTitle>
                          <Flex
                            alignItems={{ default: 'alignItemsCenter' }}
                            gap={{ default: 'gapSm' }}
                          >
                            <FlexItem>{gw.name}</FlexItem>
                            <FlexItem>
                              <Label color={gatewayStatusColor(gw.status)} isCompact>
                                {gw.status}
                              </Label>
                            </FlexItem>
                          </Flex>
                        </CardTitle>
                      </CardHeader>
                      <CardBody>
                        <Stack>
                          <StackItem>
                            <Content component="small" className="pf-v6-u-text-truncate">
                              {gw.endpoint}
                            </Content>
                          </StackItem>
                          <StackItem>
                            <Content component="small">
                              {gw.providerCount}{' '}
                              {gw.providerCount === 1 ? 'provider' : 'providers'} |{' '}
                              {gw.sandboxCount}{' '}
                              {gw.sandboxCount === 1 ? 'sandbox' : 'sandboxes'}
                            </Content>
                          </StackItem>
                        </Stack>
                      </CardBody>
                      <CardFooter>
                        <Flex gap={{ default: 'gapMd' }}>
                          <FlexItem>
                            <Button
                              variant="secondary"
                              isSmall
                              onClick={() => setGatewayForProviders(gw)}
                              data-testid={`manage-providers-${gw.name}`}
                            >
                              Manage Providers
                            </Button>
                          </FlexItem>
                          <FlexItem>
                            <Button
                              variant="link"
                              isDanger
                              isSmall
                              onClick={() => setGatewayToDelete(gw)}
                              data-testid={`delete-gateway-${gw.name}`}
                            >
                              Delete
                            </Button>
                          </FlexItem>
                        </Flex>
                      </CardFooter>
                    </Card>
                  </GalleryItem>
                ))}
                <GalleryItem>
                  <Card
                    isCompact
                    isSelectable
                    isClickable
                    data-testid="add-gateway-card"
                    onClick={() => {
                      setCreateGatewayDeployMode(false);
                      setIsCreateGatewayOpen(true);
                    }}
                  >
                    <CardBody>
                      <Flex
                        justifyContent={{ default: 'justifyContentCenter' }}
                        alignItems={{ default: 'alignItemsCenter' }}
                        direction={{ default: 'column' }}
                        gap={{ default: 'gapSm' }}
                      >
                        <FlexItem>
                          <PlusCircleIcon />
                        </FlexItem>
                        <FlexItem>
                          <Content component="p">Add gateway</Content>
                        </FlexItem>
                      </Flex>
                    </CardBody>
                  </Card>
                </GalleryItem>
              </Gallery>
            )}
          </StackItem>

          <StackItem>
            <Title headingLevel="h2">Provider Profiles</Title>
            <Content component="p">
              Provider profiles define credential schemas for AI services (Anthropic, OpenAI, Google
              Vertex, etc.). Profiles are loaded from the gateway.
            </Content>
          </StackItem>
          <StackItem>
            <EmptyState
              headingLevel="h3"
              titleText="Profiles loaded from gateway"
              variant={EmptyStateVariant.sm}
              data-testid="profiles-placeholder"
            >
              <EmptyStateBody>
                Provider profiles are available when creating a provider via &quot;Manage
                Providers&quot; on a gateway card above.
              </EmptyStateBody>
            </EmptyState>
          </StackItem>
        </Stack>
      </PageSection>

      <CreateGatewayModal
        isOpen={isCreateGatewayOpen}
        onClose={() => setIsCreateGatewayOpen(false)}
        onCreated={() => {
          setIsCreateGatewayOpen(false);
          refreshGateways();
        }}
        deployMode={createGatewayDeployMode}
      />
      {gatewayToDelete ? (
        <GatewayDeleteModal
          gateway={gatewayToDelete}
          onClose={() => setGatewayToDelete(undefined)}
          onDeleted={() => {
            setGatewayToDelete(undefined);
            refreshGateways();
          }}
        />
      ) : null}
      {gatewayForProviders ? (
        <ManageProvidersModal
          gateway={gatewayForProviders}
          onClose={() => setGatewayForProviders(undefined)}
        />
      ) : null}
    </>
  );
};

export default OpenShellManagementPage;
