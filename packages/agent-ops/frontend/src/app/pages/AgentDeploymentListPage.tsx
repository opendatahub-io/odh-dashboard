import * as React from 'react';
import { useParams } from 'react-router-dom';
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { getGenericErrorCode } from '@odh-dashboard/internal/api/errorUtils';
import { ProjectIconWithSize } from '@odh-dashboard/internal/concepts/projects/ProjectIconWithSize';
import ProjectNavigatorLink from '@odh-dashboard/internal/concepts/projects/ProjectNavigatorLink';
import { IconSize } from '@odh-dashboard/internal/types';
import {
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
  Spinner,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { BanIcon, CubesIcon, PlusCircleIcon } from '@patternfly/react-icons';
import { useAgentOpsDeploy } from '~/app/hooks/useAgentOpsDeploy';
import { useAgentOpsProjectNamespaces } from '~/app/hooks/useAgentOpsProjectNamespaces';
import AgentOpsProjectSelector from '~/app/components/AgentOpsProjectSelector';
import { useListAgentRuntimes } from '~/app/hooks/useListAgentRuntimes';
import { agentOpsDeploymentsRoute } from '~/app/utilities/routes';
import {
  filterAgentRuntimes,
  hasActiveAgentRuntimesFilters,
} from '~/app/utilities/filterAgentRuntimes';
import { useGatewayContext } from '~/app/context/GatewayContext';
import type { Gateway } from '~/app/types/gateway';
import DeploySandboxModal from '~/app/components/DeploySandboxModal';
import CreateGatewayModal from '~/app/components/CreateGatewayModal';
import GatewayDeleteModal from '~/app/components/GatewayDeleteModal';
import ManageProvidersModal from '~/app/components/ManageProvidersModal';
import AgentDeploymentsEmptyState from './AgentDeploymentsEmptyState';
import AgentRuntimesTable from './agentRuntimes/AgentRuntimesTable';
import AgentRuntimesToolbar from './agentRuntimes/AgentRuntimesToolbar';
import {
  AgentRuntimeStatusFilterOption,
  AgentRuntimesFilterOption,
  emptyAgentRuntimesFilterData,
} from './agentRuntimes/const';

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

const AgentDeploymentListPage: React.FC = () => {
  const { namespace } = useParams<{ namespace: string }>();
  const deployMode = useAgentOpsDeploy();
  const { isLoading: projectsLoading } = useAgentOpsProjectNamespaces();
  const {
    gateways,
    loaded: gatewaysLoaded,
    refresh: refreshGateways,
  } = useGatewayContext();

  // Deploy modal state
  const [isDeployModalOpen, setIsDeployModalOpen] = React.useState(false);
  // Gateway modal state
  const [isCreateGatewayOpen, setIsCreateGatewayOpen] = React.useState(false);
  const [createGatewayDeployMode, setCreateGatewayDeployMode] = React.useState(false);
  // Gateway delete modal state
  const [gatewayToDelete, setGatewayToDelete] = React.useState<Gateway | undefined>();
  // Provider management modal state
  const [gatewayForProviders, setGatewayForProviders] = React.useState<Gateway | undefined>();

  const {
    runtimes,
    continueToken,
    page,
    pageSize,
    setPage,
    setPageSize,
    loaded,
    error: loadError,
    refresh,
  } = useListAgentRuntimes(namespace);

  const safeRuntimes = React.useMemo(
    () =>
      runtimes.filter(
        (runtime) =>
          typeof runtime.name === 'string' &&
          runtime.name !== '' &&
          typeof runtime.namespace === 'string' &&
          runtime.namespace !== '' &&
          typeof runtime.status === 'string',
      ),
    [runtimes],
  );

  const [filterData, setFilterData] = React.useState(emptyAgentRuntimesFilterData);

  const onFilterUpdate = React.useCallback(
    (key: AgentRuntimesFilterOption, value?: string | AgentRuntimeStatusFilterOption) => {
      setFilterData((prev) => {
        if (typeof value === 'string') {
          return { ...prev, [key]: value || undefined };
        }
        if (value?.value) {
          return { ...prev, [key]: value };
        }
        return { ...prev, [key]: undefined };
      });
    },
    [],
  );

  const clearFilters = React.useCallback(() => {
    setFilterData(emptyAgentRuntimesFilterData);
  }, []);

  const filteredRuntimes = React.useMemo(
    () => filterAgentRuntimes(safeRuntimes, filterData),
    [safeRuntimes, filterData],
  );

  const isFiltered = hasActiveAgentRuntimesFilters(filterData);

  const noProjectSelected = !namespace;
  const isAccessDenied = !!loadError && getGenericErrorCode(loadError) === 403;
  const isEmpty = !noProjectSelected && loaded && !loadError && safeRuntimes.length === 0;

  const handleOpenDeployModal = React.useCallback(() => {
    if (namespace) {
      setIsDeployModalOpen(true);
    }
  }, [namespace]);

  const headerContent = (
    <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapMd' }}>
      <FlexItem>
        <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
          <ProjectIconWithSize size={IconSize.LG} />
          <FlexItem>
            <Content component="p">Project</Content>
          </FlexItem>
          <FlexItem>
            <AgentOpsProjectSelector
              namespace={namespace}
              getRedirectPath={agentOpsDeploymentsRoute}
            />
          </FlexItem>
          {namespace ? (
            <FlexItem>
              <ProjectNavigatorLink namespace={{ name: namespace, displayName: namespace }} />
            </FlexItem>
          ) : null}
        </Flex>
      </FlexItem>
    </Flex>
  );

  const accessDeniedState = (
    <EmptyState
      headingLevel="h2"
      icon={BanIcon}
      titleText="Access permissions needed"
      variant={EmptyStateVariant.lg}
      data-testid="agent-deployments-access-denied"
    >
      <EmptyStateBody>You do not have permission to view agent deployments.</EmptyStateBody>
    </EmptyState>
  );

  const gatewayCards = (
    <Stack hasGutter>
      <StackItem>
        <Title headingLevel="h3">Gateways</Title>
      </StackItem>
      <StackItem>
        {!gatewaysLoaded ? (
          <Spinner aria-label="Loading gateways" />
        ) : (
          <Gallery
            hasGutter
            minWidths={{ default: '250px' }}
            data-testid="gateway-cards-gallery"
          >
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
                          {gw.providerCount} {gw.providerCount === 1 ? 'provider' : 'providers'} |{' '}
                          {gw.sandboxCount} {gw.sandboxCount === 1 ? 'sandbox' : 'sandboxes'}
                        </Content>
                      </StackItem>
                    </Stack>
                  </CardBody>
                  <CardFooter>
                    <Flex gap={{ default: 'gapSm' }}>
                      <FlexItem>
                        <Button
                          variant="link"
                          isInline
                          onClick={() => setGatewayForProviders(gw)}
                          data-testid={`manage-providers-${gw.name}`}
                        >
                          Manage Providers
                        </Button>
                      </FlexItem>
                      <FlexItem>
                        <Button
                          variant="link"
                          isInline
                          isDanger
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
    </Stack>
  );

  const tableContent = () => {
    if (!loaded) {
      return <Spinner aria-label="Loading agent deployments" />;
    }

    if (isAccessDenied) {
      return accessDeniedState;
    }

    if (isEmpty && !isFiltered) {
      return (
        <AgentDeploymentsEmptyState
          namespace={namespace}
          onDeployAgent={handleOpenDeployModal}
        />
      );
    }

    return (
      <AgentRuntimesTable
        runtimes={filteredRuntimes}
        loaded={loaded}
        continueToken={continueToken}
        page={page}
        pageSize={pageSize}
        isFiltered={isFiltered}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onClearFilters={clearFilters}
        deployMode={deployMode}
        onRefresh={refresh}
        toolbarContent={
          <AgentRuntimesToolbar
            namespace={namespace}
            filterData={filterData}
            onFilterUpdate={onFilterUpdate}
            onDeployAgent={handleOpenDeployModal}
            deployMode={deployMode}
          />
        }
      />
    );
  };

  const pageContent = (
    <Stack hasGutter>
      <StackItem>{gatewayCards}</StackItem>
      <StackItem>
        <Title headingLevel="h3">Sandboxes</Title>
      </StackItem>
      <StackItem>{tableContent()}</StackItem>
    </Stack>
  );

  return (
    <>
      <ApplicationsPage
        noTitle
        description="View and manage agent deployments across your fleet."
        headerContent={headerContent}
        loadError={noProjectSelected || isAccessDenied ? undefined : loadError}
        loaded={noProjectSelected ? !projectsLoading : loaded}
        empty={noProjectSelected || (isEmpty && !isAccessDenied && gateways.length === 0)}
        emptyStatePage={
          noProjectSelected ? (
            <EmptyState
              headingLevel="h2"
              icon={CubesIcon}
              titleText="Select a project"
              variant={EmptyStateVariant.lg}
              data-testid="agent-deployments-select-project"
            >
              <EmptyStateBody>Select a project to view agent deployments.</EmptyStateBody>
            </EmptyState>
          ) : (
            <AgentDeploymentsEmptyState
              namespace={namespace}
              onDeployAgent={handleOpenDeployModal}
            />
          )
        }
        provideChildrenPadding
      >
        {pageContent}
      </ApplicationsPage>

      {namespace ? (
        <DeploySandboxModal
          isOpen={isDeployModalOpen}
          namespace={namespace}
          onClose={() => setIsDeployModalOpen(false)}
          onDeployed={() => {
            setIsDeployModalOpen(false);
            void refresh();
          }}
        />
      ) : null}

      <CreateGatewayModal
        isOpen={isCreateGatewayOpen}
        onClose={() => setIsCreateGatewayOpen(false)}
        onCreated={() => {
          setIsCreateGatewayOpen(false);
          void refreshGateways();
        }}
        deployMode={createGatewayDeployMode}
      />

      {gatewayToDelete ? (
        <GatewayDeleteModal
          gateway={gatewayToDelete}
          onClose={() => setGatewayToDelete(undefined)}
          onDeleted={() => {
            setGatewayToDelete(undefined);
            void refreshGateways();
          }}
        />
      ) : null}

      {gatewayForProviders ? (
        <ManageProvidersModal
          isOpen
          gateway={gatewayForProviders}
          onClose={() => setGatewayForProviders(undefined)}
        />
      ) : null}
    </>
  );
};

export default AgentDeploymentListPage;
