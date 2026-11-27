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
import { deleteMcpDeployment } from '~/odh/api/mcpDeploymentService';
import { BFF_HOST_PATH } from '~/app/utilities/const';
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
import { isGatewayRegistrationPending } from '~/odh/pages/mcpDeployments/utils';

type InstallStep = 'preflight' | 'installing' | 'cancelled';

type McpServerInstallModalProps = {
  server: McpServer;
  lifecycleAvailable: boolean;
  lifecycleLoaded: boolean;
  onClose: () => void;
  onContinueToDeployments?: (deployment: McpDeployment) => void;
};

type CheckState = 'pending' | 'ready' | 'blocked';

type InstallSession = {
  namespace: string;
  deploymentName?: string;
  deploymentUid?: string;
  creationTimestamp?: string;
  innovationLane: boolean;
  startedAt: number;
};

const installSessionKey = (serverName: string): string => `odh-mcp-install-session:${serverName}`;

// Gateway registration is asynchronous and can legitimately take several minutes on a
// busy cluster. It must still have a bounded, recoverable outcome for the end user.
const INSTALL_TIMEOUT_SECONDS = 10 * 60;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const readInstallSession = (serverName: string): InstallSession | undefined => {
  try {
    if (typeof window === 'undefined') {
      return undefined;
    }
    const raw = window.sessionStorage.getItem(installSessionKey(serverName));
    if (!raw) {
      return undefined;
    }
    const session: unknown = JSON.parse(raw);
    if (
      !isRecord(session) ||
      typeof session.namespace !== 'string' ||
      typeof session.startedAt !== 'number'
    ) {
      return undefined;
    }
    return {
      namespace: session.namespace,
      deploymentName:
        typeof session.deploymentName === 'string' ? session.deploymentName : undefined,
      deploymentUid: typeof session.deploymentUid === 'string' ? session.deploymentUid : undefined,
      creationTimestamp:
        typeof session.creationTimestamp === 'string' ? session.creationTimestamp : undefined,
      innovationLane: session.innovationLane === true,
      startedAt: session.startedAt,
    };
  } catch {
    return undefined;
  }
};

const writeInstallSession = (serverName: string, session: InstallSession): void => {
  try {
    if (typeof window === 'undefined') {
      return;
    }
    window.sessionStorage.setItem(installSessionKey(serverName), JSON.stringify(session));
  } catch {
    // Session storage is a convenience for refresh recovery. Live cluster state remains primary.
  }
};

const clearInstallSession = (serverName: string): void => {
  try {
    if (typeof window === 'undefined') {
      return;
    }
    window.sessionStorage.removeItem(installSessionKey(serverName));
  } catch {
    // Ignore storage failures; the cluster-backed status remains authoritative.
  }
};

export const hasMcpInstallSession = (serverName: string): boolean =>
  !!readInstallSession(serverName);

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
  onContinueToDeployments,
}) => {
  const { preferredProject } = useProjectsBridge();
  const [restoredSession] = React.useState<InstallSession | undefined>(() =>
    readInstallSession(server.name),
  );
  const [step, setStep] = React.useState<InstallStep>(restoredSession ? 'installing' : 'preflight');
  const [innovationLane, setInnovationLane] = React.useState(
    restoredSession?.innovationLane ?? false,
  );
  const [selectedNamespace, setSelectedNamespace] = React.useState(
    restoredSession?.namespace ?? preferredProject?.name ?? '',
  );
  const [deploymentName, setDeploymentName] = React.useState<string | undefined>(
    restoredSession?.deploymentName,
  );
  const [deploymentUid, setDeploymentUid] = React.useState<string | undefined>(
    restoredSession?.deploymentUid,
  );
  const [createdDeployment, setCreatedDeployment] = React.useState<McpDeployment>();
  const [installationStartedAt, setInstallationStartedAt] = React.useState<number | undefined>(
    restoredSession?.startedAt,
  );
  const [elapsedSeconds, setElapsedSeconds] = React.useState(0);
  const [submitError, setSubmitError] = React.useState<Error>();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isCancelling, setIsCancelling] = React.useState(false);
  const [cancelError, setCancelError] = React.useState<Error>();
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
    createdDeployment?.uid || deploymentUid
      ? item.uid === (createdDeployment?.uid ?? deploymentUid)
      : deploymentName
        ? item.name === deploymentName &&
          (!installationStartedAt ||
            new Date(item.creationTimestamp).getTime() >= installationStartedAt)
        : false,
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
    !isGatewayRegistrationPending(gatewayRegistrationCondition);
  const installNeedsAttention =
    installFailed || gatewayRegistrationFailed || (step === 'installing' && !!readinessError);
  const readinessReady = readinessLoaded && !readinessError && !!readiness;
  const gatewayRequirementKnown = readinessReady;
  const gatewayRequired = readiness?.gatewayRequired === true;
  const installComplete =
    !!listedDeployment &&
    readinessReady &&
    readyCondition?.status === McpConditionStatus.TRUE &&
    (!gatewayRequired || gatewayRegistrationCondition?.status === McpConditionStatus.TRUE);
  const installationRunningLong = elapsedSeconds >= 30;
  const installationTimedOut =
    step === 'installing' &&
    elapsedSeconds >= INSTALL_TIMEOUT_SECONDS &&
    !installComplete &&
    !installNeedsAttention;
  const installationTerminal = installComplete || installNeedsAttention || installationTimedOut;

  const installationPhase = (() => {
    if (installComplete) {
      return 'Complete';
    }
    if (installNeedsAttention) {
      return 'Blocked';
    }
    if (installationTimedOut) {
      return 'Timed out waiting for cluster';
    }
    if (!listedDeployment) {
      return 'Submitting resource';
    }
    if (!readinessReady) {
      return 'Checking Gateway requirement';
    }
    if (acceptedCondition?.status !== McpConditionStatus.TRUE) {
      return 'Waiting for operator';
    }
    if (readyCondition?.status !== McpConditionStatus.TRUE) {
      return 'Starting server';
    }
    if (gatewayRequired && gatewayRegistrationCondition?.status !== McpConditionStatus.TRUE) {
      return 'Registering with Gateway';
    }
    return 'Publishing status';
  })();

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
    const startedAt = Date.now();
    setInstallationStartedAt(startedAt);
    setElapsedSeconds(0);
    setCreatedDeployment(undefined);
    setDeploymentName(undefined);
    setDeploymentUid(undefined);
    writeInstallSession(server.name, {
      namespace: selectedNamespace,
      innovationLane,
      startedAt,
    });
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
      setDeploymentUid(created.uid);
      setCreatedDeployment(created);
      writeInstallSession(server.name, {
        namespace: selectedNamespace,
        deploymentName: created.name,
        deploymentUid: created.uid,
        creationTimestamp: created.creationTimestamp,
        innovationLane,
        startedAt,
      });
      setStep('installing');
    } catch (error) {
      clearInstallSession(server.name);
      setSubmitError(
        error instanceof Error ? error : new Error('Failed to start MCP server installation'),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = React.useCallback(() => {
    if (step === 'installing' && !installComplete) {
      return;
    }
    clearInstallSession(server.name);
    onClose();
  }, [installComplete, onClose, server.name, step]);

  const handleCancelInstallation = async () => {
    if (isCancelling) {
      return;
    }

    setIsCancelling(true);
    setCancelError(undefined);
    abortControllerRef.current?.abort();

    try {
      if (deploymentName) {
        await deleteMcpDeployment(BFF_HOST_PATH, { namespace: selectedNamespace })(
          {},
          deploymentName,
        );
      }
      clearInstallSession(server.name);
      setStep('cancelled');
    } catch (error) {
      setCancelError(
        error instanceof Error
          ? error
          : new Error('Failed to cancel and clean up the installation'),
      );
    } finally {
      setIsCancelling(false);
    }
  };

  const handleContinueToDeployments = React.useCallback(() => {
    if (installComplete && deployment) {
      clearInstallSession(server.name);
      onContinueToDeployments?.(deployment);
    }
  }, [deployment, installComplete, onContinueToDeployments, server.name]);

  const renderInstallStatus = () => {
    if (installationTimedOut) {
      return (
        <Alert variant="danger" isInline title="Installation timed out">
          Gateway registration did not complete within {INSTALL_TIMEOUT_SECONDS / 60} minutes. The
          cluster may still be reconciling; cancel this installation to remove the resources owned
          by this workflow, then retry after the Gateway is healthy.
        </Alert>
      );
    }
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
          detail={
            deployment
              ? 'MCPServer resource submitted'
              : deploymentName
                ? 'MCPServer created; waiting for live status'
                : 'Submitting MCPServer resource'
          }
          state={deployment || deploymentName ? 'ready' : 'pending'}
        />
        <CheckRow
          label="Reconcile MCP server"
          detail={
            readyCondition?.message ||
            (acceptedCondition?.status === McpConditionStatus.TRUE
              ? 'Accepted; waiting for the server to become ready'
              : 'Waiting for the MCP Lifecycle operator')
          }
          state={readyCondition?.status === McpConditionStatus.TRUE ? 'ready' : 'pending'}
        />
        <CheckRow
          label="Validate gateway registration"
          detail={
            gatewayRegistrationCondition?.message ||
            (!gatewayRequirementKnown
              ? readinessError?.message || 'Checking Gateway requirement'
              : gatewayRegistrationCondition?.status === McpConditionStatus.TRUE
                ? 'Gateway registration is ready'
                : gatewayRequired
                  ? 'Server is ready; waiting for Gateway registration'
                  : 'No Gateway registration required')
          }
          state={
            !gatewayRequirementKnown
              ? 'pending'
              : gatewayRegistrationCondition?.status === McpConditionStatus.TRUE
                ? 'ready'
                : gatewayRequired
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
      onClose={step === 'installing' && !installComplete ? () => undefined : handleClose}
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
                  : installationTimedOut
                    ? 'Installation timed out'
                    : installNeedsAttention
                      ? 'Installation needs attention'
                      : 'Installing...'}
              </Title>
              <Content component="p">
                Project: {selectedNamespace} · Lane: {innovationLane ? 'Innovation' : 'Production'}
              </Content>
              <Content component="small">
                Phase: {installationPhase}.{' '}
                {installationStartedAt && !installationTerminal
                  ? `Elapsed: ${Math.floor(elapsedSeconds / 60)}m ${elapsedSeconds % 60}s.`
                  : ''}
              </Content>
              {installComplete && (
                <Content component="small">
                  All required checks passed. Continue to deployments to use the new install.
                </Content>
              )}
              {!installationTerminal && (
                <Content component="small">
                  Live status is polled from the selected project.{' '}
                  {installationRunningLong ? 'This phase is taking longer than expected.' : ''}
                </Content>
              )}
              {installationTimedOut && (
                <Alert variant="warning" isInline title="Recovery is available">
                  Cancel installation removes only the resources created by this workflow. Shared
                  platform operators and Gateway resources are not removed.
                </Alert>
              )}
            </StackItem>
            <StackItem>{renderInstallStatus()}</StackItem>
            {cancelError && (
              <StackItem>
                <Alert variant="danger" isInline title="Cancellation needs attention">
                  {cancelError.message}
                </Alert>
              </StackItem>
            )}
            {!installationTerminal && !listedDeployment && (
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
        {step === 'cancelled' && (
          <Stack hasGutter>
            <StackItem>
              <Title headingLevel="h3" size="lg">
                Installation cancelled
              </Title>
              <Content component="p">
                The installation resources owned by this workflow were removed. Shared platform
                operators and Gateway resources were left untouched.
              </Content>
            </StackItem>
          </Stack>
        )}
      </ModalBody>
      <ModalFooter>
        {step === 'preflight' && (
          <>
            <Button variant="link" onClick={handleClose}>
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
          (installComplete ? (
            <>
              <Button variant="link" onClick={handleClose}>
                Close
              </Button>
              {deployment && onContinueToDeployments && (
                <Button variant="primary" onClick={handleContinueToDeployments}>
                  Continue to deployments
                </Button>
              )}
            </>
          ) : (
            <>
              <Button
                variant="danger"
                onClick={handleCancelInstallation}
                isDisabled={isCancelling || !deploymentName}
                isLoading={isCancelling}
                data-testid="mcp-install-cancel"
              >
                {isCancelling ? 'Cancelling installation' : 'Cancel installation'}
              </Button>
              <Content component="small">
                {installationTimedOut
                  ? 'The installation exceeded its recovery window.'
                  : 'You can cancel if the cluster stops progressing.'}
              </Content>
            </>
          ))}
        {step === 'cancelled' && (
          <Button variant="primary" onClick={handleClose}>
            Close
          </Button>
        )}
      </ModalFooter>
    </Modal>
  );
};

export default McpServerInstallModal;
