import * as React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  Button,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  EmptyState,
  EmptyStateBody,
  EmptyStateVariant,
  Label,
  Spinner,
  Stack,
  StackItem,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { CubesIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import { useFetchState, type FetchStateCallbackPromise, type APIOptions } from 'mod-arch-core';
import { useMutation } from '@tanstack/react-query';
import ApplicationsPage from '~/app/components/ApplicationsPage';
import { getGateway } from '~/app/api/gateways';
import { deleteProvider, listProviders } from '~/app/api/providers';
import { agentOpsGatewaysPath } from '~/app/utilities/routes';
import type { Gateway } from '~/app/types/gateway';
import type { Provider } from '~/app/types/provider';
import CreateProviderModal from '~/app/components/CreateProviderModal';

const GatewayDetailPage: React.FC = () => {
  const { gwName } = useParams<{ gwName: string }>();
  const navigate = useNavigate();
  const [isCreateProviderOpen, setIsCreateProviderOpen] = React.useState(false);

  const fetchGateway = React.useCallback<FetchStateCallbackPromise<Gateway | null>>(
    async (opts) => {
      if (!gwName) {
        return null;
      }
      return getGateway('', gwName)(opts);
    },
    [gwName],
  );

  const [gateway, gatewayLoaded, gatewayError] = useFetchState<Gateway | null>(
    fetchGateway,
    null,
  );

  const fetchProviders = React.useCallback<FetchStateCallbackPromise<Provider[]>>(
    async (opts) => {
      if (!gwName) {
        return [];
      }
      return listProviders('', gwName)(opts);
    },
    [gwName],
  );

  const [providers, providersLoaded, , refreshProviders] = useFetchState<Provider[]>(
    fetchProviders,
    [],
  );

  const { mutate: deleteProviderMutate, isPending: isDeleting } = useMutation({
    mutationKey: ['agent-ops', 'deleteProvider', gwName],
    mutationFn: async (provName: string) => {
      const apiOpts: APIOptions = {};
      return deleteProvider('', gwName ?? '')(apiOpts, provName);
    },
    onSuccess: () => {
      void refreshProviders();
    },
    retry: false,
  });

  const handleProviderCreated = React.useCallback(() => {
    setIsCreateProviderOpen(false);
    void refreshProviders();
  }, [refreshProviders]);

  if (!gwName) {
    navigate(agentOpsGatewaysPath);
    return null;
  }

  if (!gatewayLoaded) {
    return <Spinner aria-label="Loading gateway details" />;
  }

  if (gatewayError) {
    return (
      <EmptyState
        headingLevel="h2"
        icon={ExclamationCircleIcon}
        titleText="Unable to load gateway"
        variant={EmptyStateVariant.lg}
        data-testid="gateway-detail-error"
      >
        <EmptyStateBody>{gatewayError.message}</EmptyStateBody>
      </EmptyState>
    );
  }

  if (!gateway) {
    return (
      <EmptyState
        headingLevel="h2"
        icon={ExclamationCircleIcon}
        titleText="Gateway not found"
        variant={EmptyStateVariant.lg}
        data-testid="gateway-detail-not-found"
      >
        <EmptyStateBody>{`Gateway "${gwName}" was not found.`}</EmptyStateBody>
      </EmptyState>
    );
  }

  const statusColor =
    gateway.status === 'healthy' ? 'green' : gateway.status === 'unhealthy' ? 'red' : 'grey';

  const breadcrumb = (
    <Breadcrumb>
      <BreadcrumbItem>
        <Link to={agentOpsGatewaysPath}>Gateways</Link>
      </BreadcrumbItem>
      <BreadcrumbItem isActive>{gateway.name}</BreadcrumbItem>
    </Breadcrumb>
  );

  return (
    <ApplicationsPage
      title={gateway.name}
      description={`Gateway endpoint: ${gateway.endpoint}`}
      loaded
      empty={false}
      provideChildrenPadding
      breadcrumb={breadcrumb}
    >
      <Stack hasGutter>
        <StackItem>
          <DescriptionList>
            <DescriptionListGroup>
              <DescriptionListTerm>Status</DescriptionListTerm>
              <DescriptionListDescription>
                <Label color={statusColor} isCompact>
                  {gateway.status}
                </Label>
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Endpoint</DescriptionListTerm>
              <DescriptionListDescription>{gateway.endpoint}</DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Namespace</DescriptionListTerm>
              <DescriptionListDescription>
                {gateway.namespace || 'Not specified'}
              </DescriptionListDescription>
            </DescriptionListGroup>
            <DescriptionListGroup>
              <DescriptionListTerm>Scope</DescriptionListTerm>
              <DescriptionListDescription>
                {gateway.isGlobal ? 'Global' : 'Project-scoped'}
              </DescriptionListDescription>
            </DescriptionListGroup>
          </DescriptionList>
        </StackItem>
        <StackItem>
          <Toolbar>
            <ToolbarContent>
              <ToolbarItem>
                <Button
                  variant="primary"
                  onClick={() => setIsCreateProviderOpen(true)}
                  data-testid="add-provider-button"
                >
                  Add provider
                </Button>
              </ToolbarItem>
            </ToolbarContent>
          </Toolbar>
        </StackItem>
        <StackItem>
          {!providersLoaded ? (
            <Spinner aria-label="Loading providers" />
          ) : providers.length === 0 ? (
            <EmptyState
              headingLevel="h3"
              icon={CubesIcon}
              titleText="No providers configured"
              variant={EmptyStateVariant.sm}
              data-testid="providers-empty-state"
            >
              <EmptyStateBody>
                Add a provider to configure LLM access through this gateway.
              </EmptyStateBody>
            </EmptyState>
          ) : (
            <Table aria-label="Providers table" data-testid="providers-table">
              <Thead>
                <Tr>
                  <Th>Name</Th>
                  <Th>Type / Profile</Th>
                  <Th>Actions</Th>
                </Tr>
              </Thead>
              <Tbody>
                {providers.map((prov) => (
                  <Tr key={prov.id} data-testid={`provider-row-${prov.name}`}>
                    <Td dataLabel="Name">{prov.name}</Td>
                    <Td dataLabel="Type / Profile">{prov.profileName ?? prov.type}</Td>
                    <Td dataLabel="Actions">
                      <Button
                        variant="danger"
                        isInline
                        isDisabled={isDeleting}
                        onClick={() => deleteProviderMutate(prov.name)}
                        data-testid={`provider-delete-${prov.name}`}
                      >
                        Delete
                      </Button>
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          )}
        </StackItem>
      </Stack>
      <CreateProviderModal
        isOpen={isCreateProviderOpen}
        gatewayName={gwName}
        onClose={() => setIsCreateProviderOpen(false)}
        onCreated={handleProviderCreated}
      />
    </ApplicationsPage>
  );
};

export default GatewayDetailPage;
