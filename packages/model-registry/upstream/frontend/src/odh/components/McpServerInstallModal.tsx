import React from 'react';
import {
  Alert,
  Button,
  Content,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  List,
  ListItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Switch,
  Spinner,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import { CheckCircleIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import { APIOptions } from 'mod-arch-core';
import { isValidK8sName, translateDisplayNameForK8s } from '@odh-dashboard/k8s-core';
import { useProjectsBridge } from '~/odh/context/ProjectsBridgeContext';
import NamespaceSelectorFieldWrapper from '~/odh/components/NamespaceSelectorFieldWrapper';
import useMcpDeployments from '~/odh/pages/mcpDeployments/useMcpDeployments';
import { createMcpDeployment } from '~/odh/api/mcpCatalogDeployment/service';
import useMcpImageDeployReadiness from '~/odh/hooks/useMcpImageDeployReadiness';
import type { McpServer } from '~/app/mcpServerCatalogTypes';
import {
  McpConditionStatus,
  McpReadyReason,
  type McpDeployment,
  type McpGatewayRegistration,
} from '~/odh/types/mcpDeploymentTypes';
import { mcpServerCRToYaml } from '~/odh/utils/mcpServerYaml';
import {
  mcpServerCatalogImage,
  mcpServerCatalogPrerequisites,
  mcpServerCatalogToCR,
} from '~/odh/utils/mcpServerCatalog';

type InstallStep = 'preflight' | 'installing';

type McpServerInstallModalProps = {
  server: McpServer;
  lifecycleAvailable: boolean;
  lifecycleLoaded: boolean;
  onClose: () => void;
};

type CheckState = 'pending' | 'ready' | 'blocked';

const CheckRow: React.FC<{
  label: string;
  detail: string;
  state: CheckState;
}> = ({ label, detail, state }) => {
  const icon =
    state === 'ready' ? (
      <CheckCircleIcon color="var(--pf-t--global--color--status--success--default)" />
    ) : state === 'blocked' ? (
      <ExclamationCircleIcon color="var(--pf-t--global--color--status--danger--default)" />
    ) : (
      <Spinner size="sm" aria-label={`${label} in progress`} />
    );

  return (
    <ListItem>
      <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsFlexStart' }}>
        <FlexItem>{icon}</FlexItem>
        <FlexItem>
          <Content component="p">
            <b>{label}</b>
          </Content>
          <Content component="small">{detail}</Content>
        </FlexItem>
      </Flex>
    </ListItem>
  );
};

const conditionFor = (deployment: McpDeployment | undefined, type: string) =>
  deployment?.conditions.find((condition) => condition.type === type);

const McpServerInstallModal: React.FC<McpServerInstallModalProps> = ({
  server,
  lifecycleAvailable,
  lifecycleLoaded,
  onClose,
}) => {
  const { preferredProject } = useProjectsBridge();
  const [step, setStep] = React.useState<InstallStep>('preflight');
  const [innovationLane, setInnovationLane] = React.useState(false);
  const [selectedNamespace, setSelectedNamespace] = React.useState(preferredProject?.name ?? '');
  const [deploymentName, setDeploymentName] = React.useState<string>();
  const [createdDeployment, setCreatedDeployment] = React.useState<McpDeployment>();
  const [installationStartedAt, setInstallationStartedAt] = React.useState<number>();
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
  const [submitError, setSubmitError] = React.useState<Error>();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const abortControllerRef = React.useRef<AbortController>();
  const [deploymentData] = useMcpDeployments(selectedNamespace);
  const deployments = deploymentData.items;
  const displayName = server.displayName || server.name;
  const k8sName = translateDisplayNameForK8s(displayName);
  const crData = React.useMemo(() => mcpServerCatalogToCR(server, k8sName), [k8sName, server]);
  const prerequisites = React.useMemo(
    () => mcpServerCatalogPrerequisites(server.runtimeMetadata ?? {}),
    [server.runtimeMetadata],
  );
  const crError = crData
    ? undefined
    : new Error('Catalog entry does not include a deployable container image');
  const image = mcpServerCatalogImage(server);
  const [readiness, readinessLoaded, readinessError] = useMcpImageDeployReadiness(
    selectedNamespace,
    image,
  );

  React.useEffect(() => {
    if (!selectedNamespace && preferredProject?.name) {
      setSelectedNamespace(preferredProject.name);
    }
  }, [preferredProject?.name, selectedNamespace]);

  React.useEffect(
    () => () => {
      abortControllerRef.current?.abort();
    },
    [],
  );

  // A name-only match can select a previous installation while a new operation
  // is still reconciling. Match the live list to the object returned by this
  // create operation whenever a UID is available.
  const listedDeployment = deployments.find((item) =>
    createdDeployment?.uid
      ? item.uid === createdDeployment.uid
      : item.name === deploymentName &&
        (!installationStartedAt ||
          new Date(item.creationTimestamp).getTime() >= installationStartedAt),
  );
  const deployment = listedDeployment ?? createdDeployment;
  const readyCondition = conditionFor(deployment, 'Ready');
  const acceptedCondition = conditionFor(deployment, 'Accepted');
  const gatewayRegistrationCondition = conditionFor(deployment, 'GatewayRegistration');
  const installFailed =
    acceptedCondition?.status === 'False' ||
    (readyCondition?.status === 'False' &&
      readyCondition.reason !== McpReadyReason.INITIALIZING &&
      readyCondition.reason !== 'Pending');
  const gatewayRegistrationFailed =
    gatewayRegistrationCondition?.status === 'False' &&
    gatewayRegistrationCondition.reason !== 'Pending';
  const installNeedsAttention = installFailed || gatewayRegistrationFailed;
  const readinessReady = readinessLoaded && !readinessError && !!readiness;
  const gatewayRequired = readiness?.gatewayRequired === true;
  const installComplete =
    !!listedDeployment &&
    readinessReady &&
    readyCondition?.status === McpConditionStatus.TRUE &&
    (!gatewayRequired || gatewayRegistrationCondition?.status === McpConditionStatus.TRUE);
  const installationTerminal = installComplete || installNeedsAttention;
  const installationRunningLong = elapsedSeconds >= 30;

  React.useEffect(() => {
    if (step !== 'installing' || !installationStartedAt || installationTerminal) {
      return undefined;
    }

    const updateElapsed = () =>
      setElapsedSeconds(Math.max(0, Math.floor((Date.now() - installationStartedAt) / 1000)));
    updateElapsed();
    const timer = window.setInterval(updateElapsed, 1000);
    return () => window.clearInterval(timer);
  }, [installationStartedAt, installationTerminal, step]);

  const runtimeState: CheckState = crData?.spec.source.containerImage?.ref ? 'ready' : 'blocked';
  const lifecycleState: CheckState = !lifecycleLoaded
    ? 'pending'
    : lifecycleAvailable
      ? 'ready'
      : 'blocked';
  const gatewayState: CheckState =
    readinessError || (readinessLoaded && !readiness?.deployable)
      ? 'blocked'
      : readinessLoaded && readiness?.deployable
        ? 'ready'
        : 'pending';
  // The current MCP Catalog/Lifecycle/Gateway path is Technology Preview. The
  // readiness response remains the source of truth so this can become
  // production-safe when the platform reports a supported release.
  const supportLevel = readiness?.supportLevel ?? 'technologyPreview';
  const supportReady = innovationLane || supportLevel === 'production';
  const supportMessage =
    readiness?.supportMessage ||
    'MCP Catalog, MCP Lifecycle, and MCP Gateway are Technology Preview features in this platform release.';
  const preflightReady =
    lifecycleState === 'ready' &&
    gatewayState === 'ready' &&
    runtimeState === 'ready' &&
    supportReady;

  const handleInstall = async () => {
    if (!crData || !selectedNamespace || !k8sName || !isValidK8sName(k8sName) || !supportReady) {
      return;
    }

    setIsSubmitting(true);
    setSubmitError(undefined);
    setInstallationStartedAt(Date.now());
    setElapsedSeconds(0);
    setCreatedDeployment(undefined);
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const opts: APIOptions = { signal: controller.signal };
      const created = await createMcpDeployment('', { namespace: selectedNamespace })(opts, {
        name: k8sName,
        displayName,
        serverName: server.name,
        image: crData.spec.source.containerImage?.ref ?? '',
        yaml: mcpServerCRToYaml(crData),
        prerequisites,
        gatewayRegistration: readiness?.gatewayRequired
          ? ({
              category: ['mcp'],
              hint: server.description || displayName,
              // Keep independently installed catalog servers coexistable when a
              // cluster already federates the same tool names through another
              // registration. The Gateway CRD uses this prefix only for the
              // federated capability names; the upstream MCP server is unchanged.
              prefix: `${k8sName.replace(/-/g, '_')}_`,
              path: crData.spec.config.path || '/mcp',
              tags: server.tags,
            } satisfies McpGatewayRegistration)
          : undefined,
      });
      setDeploymentName(created.name);
      setCreatedDeployment(created);
      setStep('installing');
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error : new Error('Failed to start MCP server installation'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderInstallStatus = () => {
    if (installNeedsAttention) {
      return (
        <Alert variant="danger" isInline title="Installation needs attention">
          {readyCondition?.message ||
            acceptedCondition?.message ||
            gatewayRegistrationCondition?.message ||
            'The MCP deployment did not become ready.'}
        </Alert>
      );
    }

    return (
      <List isPlain>
        <CheckRow
          label="Create MCP deployment"
          detail="MCPServer resource submitted to the selected project"
          state={deployment ? 'ready' : 'pending'}
        />
        <CheckRow
          label="Reconcile MCP server"
          detail={
            readyCondition?.message ||
            (acceptedCondition?.status === McpConditionStatus.TRUE
              ? 'MCPServer accepted; waiting for the server workload to become ready'
              : 'MCPServer submitted; waiting for the MCP Lifecycle operator to publish status')
          }
          state={installComplete ? 'ready' : 'pending'}
        />
        <CheckRow
          label="Validate gateway registration"
          detail={
            gatewayRegistrationCondition?.message ||
            (gatewayRegistrationCondition?.status === McpConditionStatus.TRUE
              ? 'MCP Gateway registration is ready'
              : readiness?.gatewayRequired
                ? 'MCP server is ready; waiting for MCP Gateway registration'
                : 'Gateway registration is not required for this server')
          }
          state={
            gatewayRegistrationCondition?.status === McpConditionStatus.TRUE
              ? 'ready'
              : readiness?.gatewayRequired
                ? 'pending'
                : 'ready'
          }
        />
      </List>
    );
  };

  return (
    <Modal
      isOpen
      variant="medium"
      onClose={step === 'installing' && !installationTerminal ? () => undefined : onClose}
      data-testid="mcp-install-modal"
    >
      <ModalHeader
        title={`Install ${displayName}`}
        description="A guided install from the AI Hub MCP catalog. The installer checks prerequisites before it creates resources and follows the deployment until the cluster reports its status."
        data-testid="mcp-install-modal-title"
      />
      <ModalBody>
        {step === 'preflight' && (
          <Stack hasGutter>
            <StackItem>
              <Title headingLevel="h3" size="lg">
                Check prerequisites
              </Title>
              <Content component="p">
                External platform operators are never installed or upgraded by this workflow.
              </Content>
            </StackItem>
            <StackItem>
              <Switch
                id="mcp-install-innovation-lane"
                label="Use Innovation lane"
                isChecked={innovationLane}
                onChange={(_event, checked) => setInnovationLane(checked)}
                data-testid="mcp-install-innovation-lane"
              />
              <Content component="small">
                Production is selected by default. Innovation explicitly permits the current
                Technology Preview dependency without changing the shipped workflow.
              </Content>
            </StackItem>
            <StackItem>
              <Form>
                <FormGroup label="Project" isRequired fieldId="mcp-install-project-preflight">
                  <NamespaceSelectorFieldWrapper
                    selectedNamespace={selectedNamespace}
                    onSelect={setSelectedNamespace}
                    isFullWidth
                    selectorOnly
                  />
                  <Content component="small">
                    Choose the project where this MCP server will be installed. The readiness checks
                    below use this project.
                  </Content>
                </FormGroup>
              </Form>
            </StackItem>
            <StackItem>
              <List isPlain>
                <CheckRow
                  label="MCP Lifecycle operator"
                  detail={
                    lifecycleAvailable
                      ? 'Available through the current platform configuration'
                      : 'Enable the MCP Lifecycle component before installing'
                  }
                  state={lifecycleState}
                />
                <CheckRow
                  label="MCP gateway"
                  detail={
                    readinessError?.message ||
                    readiness?.message ||
                    (readinessLoaded
                      ? readiness?.gatewayRequired
                        ? 'Gateway is ready for this server'
                        : 'No gateway is required by this catalog entry'
                      : 'Checking MCP Gateway availability')
                  }
                  state={gatewayState}
                />
                <CheckRow
                  label="Runtime definition"
                  detail={crError?.message || 'Catalog runtime metadata and container image'}
                  state={runtimeState}
                />
                <CheckRow
                  label="Support lane"
                  detail={`${innovationLane ? 'Innovation' : 'Production'} lane: ${supportMessage}`}
                  state={supportReady ? 'ready' : 'blocked'}
                />
              </List>
            </StackItem>
            {!supportReady && (
              <StackItem>
                <Alert variant="warning" isInline title="Production lane is unavailable">
                  {supportMessage} Select Use Innovation lane to continue evaluation on this
                  cluster.
                </Alert>
              </StackItem>
            )}
            {(!preflightReady || submitError) && (
              <StackItem>
                <Alert variant="warning" isInline title="Installation is not ready">
                  Resolve the blocked prerequisite before continuing. This keeps the failure at the
                  real dependency instead of creating a partial deployment.
                </Alert>
              </StackItem>
            )}
            {submitError && (
              <StackItem>
                <Alert variant="danger" isInline title="Unable to start installation">
                  {submitError.message}
                </Alert>
              </StackItem>
            )}
          </Stack>
        )}

        {step === 'installing' && (
          <Stack hasGutter>
            <StackItem>
              <Title headingLevel="h3" size="lg">
                {installComplete
                  ? 'Installation complete'
                  : installNeedsAttention
                    ? 'Installation needs attention'
                    : 'Installing...'}
              </Title>
              <Content component="p">
                Live status is read from the MCP deployment in the selected project. Lane:{' '}
                {innovationLane ? 'Innovation' : 'Production'}.
              </Content>
              <Content component="small">
                {installComplete
                  ? 'The MCP server and required Gateway registration are ready.'
                  : installNeedsAttention
                    ? 'The cluster reported a blocked installation step.'
                    : !listedDeployment
                      ? 'The create request was accepted; waiting for the live deployment record.'
                      : acceptedCondition?.status !== McpConditionStatus.TRUE
                        ? 'Waiting for the MCP Lifecycle operator to accept the MCPServer.'
                        : readyCondition?.status !== McpConditionStatus.TRUE
                          ? 'The MCPServer is accepted; waiting for its workload to become ready.'
                          : gatewayRequired &&
                              gatewayRegistrationCondition?.status !== McpConditionStatus.TRUE
                            ? 'The MCP server is ready; waiting for Gateway registration to become ready.'
                            : 'The cluster is publishing the final installation status.'}{' '}
                {installationStartedAt && !installationTerminal
                  ? `Elapsed: ${Math.floor(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s.`
                  : ''}
              </Content>
              {!installationTerminal && (
                <Content component="small">
                  The dashboard polls the selected project for the live MCPServer status.{' '}
                  {installationRunningLong
                    ? 'This phase is taking longer than expected; the modal remains open until the cluster reports success or a blocked condition.'
                    : 'The controls remain locked until the cluster reports a terminal result.'}
                </Content>
              )}
            </StackItem>
            <StackItem>{renderInstallStatus()}</StackItem>
            {!listedDeployment && !installFailed && (
              <StackItem>
                <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
                  <FlexItem>
                    <Spinner size="sm" aria-label="Waiting for deployment status" />
                  </FlexItem>
                  <FlexItem>Waiting for the cluster to publish the deployment status...</FlexItem>
                </Flex>
              </StackItem>
            )}
          </Stack>
        )}
      </ModalBody>
      <ModalFooter>
        {step === 'preflight' && (
          <>
            <Button variant="link" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleInstall}
              isDisabled={!preflightReady || isSubmitting}
              isLoading={isSubmitting}
              data-testid="mcp-install-submit"
            >
              Install MCP server
            </Button>
          </>
        )}
        {step === 'installing' &&
          (installationTerminal ? (
            <Button variant="link" onClick={onClose}>
              Close
            </Button>
          ) : (
            <Content component="small">
              Installation remains open here until the cluster reports success or a blocked
              condition. No navigation is available during the active install.
            </Content>
          ))}
      </ModalFooter>
    </Modal>
  );
};

export default McpServerInstallModal;
