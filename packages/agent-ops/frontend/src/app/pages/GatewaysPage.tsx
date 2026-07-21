import * as React from 'react';
import {
  Button,
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
import { CubesIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import { useGatewayContext } from '~/app/context/GatewayContext';
import { agentOpsGatewayDetailRoute } from '~/app/utilities/routes';
import CreateGatewayModal from '~/app/components/CreateGatewayModal';
import GatewayDeleteModal from '~/app/components/GatewayDeleteModal';
import type { Gateway } from '~/app/types/gateway';

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

const GatewaysPage: React.FC = () => {
  const { gateways, loaded, error, refresh } = useGatewayContext();
  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
  const [deleteGateway, setDeleteGateway] = React.useState<Gateway | null>(null);

  const handleCreated = React.useCallback(() => {
    setIsCreateModalOpen(false);
    void refresh();
  }, [refresh]);

  const handleDeleted = React.useCallback(() => {
    setDeleteGateway(null);
    void refresh();
  }, [refresh]);

  if (!loaded) {
    return <Spinner aria-label="Loading gateways" />;
  }

  if (error) {
    return (
      <EmptyState
        headingLevel="h2"
        icon={CubesIcon}
        titleText="Unable to load gateways"
        variant={EmptyStateVariant.lg}
        data-testid="gateways-load-error"
      >
        <EmptyStateBody>{error.message}</EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <Stack hasGutter>
      <StackItem>
        <Toolbar>
          <ToolbarContent>
            <ToolbarItem>
              <Button
                variant="primary"
                onClick={() => setIsCreateModalOpen(true)}
                data-testid="register-gateway-button"
              >
                Register gateway
              </Button>
            </ToolbarItem>
          </ToolbarContent>
        </Toolbar>
      </StackItem>
      <StackItem>
        {gateways.length === 0 ? (
          <EmptyState
            headingLevel="h2"
            icon={CubesIcon}
            titleText="No gateways registered"
            variant={EmptyStateVariant.lg}
            data-testid="gateways-empty-state"
          >
            <EmptyStateBody>
              Register an OpenShell gateway to manage providers and deploy agents.
            </EmptyStateBody>
          </EmptyState>
        ) : (
          <Table aria-label="Gateways table" data-testid="gateways-table">
            <Thead>
              <Tr>
                <Th>Name</Th>
                <Th>Status</Th>
                <Th>Endpoint</Th>
                <Th>Providers</Th>
                <Th>Sandboxes</Th>
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {gateways.map((gw) => (
                <Tr key={gw.name} data-testid={`gateway-row-${gw.name}`}>
                  <Td dataLabel="Name">
                    <Button
                      variant="link"
                      isInline
                      component={(props) => (
                        <Link {...props} to={agentOpsGatewayDetailRoute(gw.name)} />
                      )}
                      data-testid={`gateway-link-${gw.name}`}
                    >
                      {gw.name}
                    </Button>
                    {gw.isGlobal ? (
                      <>
                        {' '}
                        <Label isCompact color="blue">
                          Global
                        </Label>
                      </>
                    ) : null}
                  </Td>
                  <Td dataLabel="Status">
                    <Label color={gatewayStatusColor(gw.status)} isCompact>
                      {gw.status}
                    </Label>
                  </Td>
                  <Td dataLabel="Endpoint">{gw.endpoint}</Td>
                  <Td dataLabel="Providers">{gw.providerCount}</Td>
                  <Td dataLabel="Sandboxes">{gw.sandboxCount}</Td>
                  <Td dataLabel="Actions">
                    <Button
                      variant="danger"
                      isInline
                      onClick={() => setDeleteGateway(gw)}
                      data-testid={`gateway-delete-${gw.name}`}
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
      <CreateGatewayModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreated={handleCreated}
      />
      {deleteGateway ? (
        <GatewayDeleteModal
          gateway={deleteGateway}
          onClose={() => setDeleteGateway(null)}
          onDeleted={handleDeleted}
        />
      ) : null}
    </Stack>
  );
};

export default GatewaysPage;
