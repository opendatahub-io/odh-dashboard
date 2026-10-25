import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  Content,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  Label,
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
import { CheckCircleIcon, ExclamationCircleIcon, InProgressIcon } from '@patternfly/react-icons';
import { APIOptions } from 'mod-arch-core';
import { isValidK8sName, translateDisplayNameForK8s } from '@odh-dashboard/k8s-core';
import { useProjectsBridge } from '~/odh/context/ProjectsBridgeContext';
import NamespaceSelectorFieldWrapper from '~/odh/components/NamespaceSelectorFieldWrapper';
import useMcpDeployments from '~/odh/pages/mcpDeployments/useMcpDeployments';
import { createMcpDeployment } from '~/odh/api/mcpCatalogDeployment/service';
import useMcpImageDeployReadiness from '~/odh/hooks/useMcpImageDeployReadiness';
import { mcpDeploymentsUrl } from '~/app/routes/mcpCatalog/mcpCatalog';
import type { McpServer } from '~/app/mcpServerCatalogTypes';
import type { McpDeployment } from '~/odh/types/mcpDeploymentTypes';
import { mcpServerCRToYaml } from '~/odh/utils/mcpServerYaml';
import { mcpServerCatalogImage, mcpServerCatalogToCR } from '~/odh/utils/mcpServerCatalog';

type InstallStep = 'preflight' | 'review' | 'installing';

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
      <InProgressIcon />
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
  const navigate = useNavigate();
  const { preferredProject } = useProjectsBridge();
  const [step, setStep] = React.useState<InstallStep>('preflight');
  const [innovationLane, setInnovationLane] = React.useState(false);
  const [selectedNamespace, setSelectedNamespace] = React.useState(preferredProject?.name ?? '');
  const [deploymentName, setDeploymentName] = React.useState<string>();
  const [submitError, setSubmitError] = React.useState<Error>();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const abortControllerRef = React.useRef<AbortController>();
  const [deploymentData] = useMcpDeployments(selectedNamespace);
  const deployments = deploymentData.items;
  const displayName = server.displayName || server.name;
  const k8sName = translateDisplayNameForK8s(displayName);
  const crData = React.useMemo(() => mcpServerCatalogToCR(server, k8sName), [k8sName, server]);
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

  const deployment = deployments.find((item) => item.name === deploymentName);
  const readyCondition = conditionFor(deployment, 'Ready');
  const acceptedCondition = conditionFor(deployment, 'Accepted');
  const installFailed = readyCondition?.status === 'False' || acceptedCondition?.status === 'False';
  const installComplete = readyCondition?.status === 'True';

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
      });
      setDeploymentName(created.name);
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
    if (installFailed) {
      return (
        <Alert variant="danger" isInline title="Installation needs attention">
          {readyCondition?.message ||
            acceptedCondition?.message ||
            'The MCP deployment did not become ready.'}
        </Alert>
      );
    }

    return (
      <List isPlain>
        <CheckRow
          label="Create MCP deployment"
          detail="MCPServer resource submitted to the selected project"
          state="ready"
        />
        <CheckRow
          label="Reconcile MCP server"
          detail={readyCondition?.message || 'Waiting for the MCP Lifecycle operator'}
          state={installComplete ? 'ready' : 'pending'}
        />
        <CheckRow
          label="Validate gateway registration"
          detail={
            installComplete ? 'The deployment reports Ready' : 'Waiting for the deployment status'
          }
          state={installComplete ? 'ready' : 'pending'}
        />
      </List>
    );
  };

  return (
    <Modal isOpen variant="medium" onClose={onClose} data-testid="mcp-install-modal">
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
                    (readiness?.gatewayRequired
                      ? 'Gateway is ready for this server'
                      : 'No gateway is required by this catalog entry')
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
                <Alert variant="danger" isInline title="Unable to continue">
                  {submitError.message}
                </Alert>
              </StackItem>
            )}
          </Stack>
        )}

        {step === 'review' && (
          <Stack hasGutter>
            <StackItem>
              <Title headingLevel="h3" size="lg">
                Review installation
              </Title>
              <Content component="p">
                The following resources will be created in the selected project using the catalog
                runtime definition.
              </Content>
            </StackItem>
            <StackItem>
              <Form>
                <FormGroup label="Project" isRequired fieldId="mcp-install-project">
                  <NamespaceSelectorFieldWrapper
                    selectedNamespace={selectedNamespace}
                    onSelect={setSelectedNamespace}
                    isFullWidth
                  />
                </FormGroup>
              </Form>
            </StackItem>
            <StackItem>
              <Card>
                <CardHeader>
                  <Title headingLevel="h4" size="md">
                    Resources
                  </Title>
                </CardHeader>
                <CardBody>
                  <DescriptionList isCompact>
                    <DescriptionListGroup>
                      <DescriptionListTerm>Lane</DescriptionListTerm>
                      <DescriptionListDescription>
                        <Label color={innovationLane ? 'orange' : 'green'}>
                          {innovationLane ? 'Innovation' : 'Production'}
                        </Label>
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                    <DescriptionListGroup>
                      <DescriptionListTerm>Server</DescriptionListTerm>
                      <DescriptionListDescription>{displayName}</DescriptionListDescription>
                    </DescriptionListGroup>
                    <DescriptionListGroup>
                      <DescriptionListTerm>Deployment</DescriptionListTerm>
                      <DescriptionListDescription>
                        <Label color="blue">{k8sName}</Label>
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                    <DescriptionListGroup>
                      <DescriptionListTerm>Image</DescriptionListTerm>
                      <DescriptionListDescription className="pf-v6-u-text-break-word">
                        {crData?.spec.source.containerImage?.ref}
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                  </DescriptionList>
                </CardBody>
              </Card>
            </StackItem>
          </Stack>
        )}

        {step === 'installing' && (
          <Stack hasGutter>
            <StackItem>
              <Title headingLevel="h3" size="lg">
                {installComplete
                  ? 'Installation complete'
                  : installFailed
                    ? 'Installation needs attention'
                    : 'Installing...'}
              </Title>
              <Content component="p">
                Live status is read from the MCP deployment in the selected project. Lane:{' '}
                {innovationLane ? 'Innovation' : 'Production'}.
              </Content>
            </StackItem>
            <StackItem>{renderInstallStatus()}</StackItem>
            {!deployment && !installFailed && (
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
              onClick={() => setStep('review')}
              isDisabled={!preflightReady}
              data-testid="mcp-install-continue"
            >
              Continue to install
            </Button>
          </>
        )}
        {step === 'review' && (
          <>
            <Button variant="link" onClick={() => setStep('preflight')}>
              Back
            </Button>
            <Button
              variant="primary"
              onClick={handleInstall}
              isDisabled={!selectedNamespace || !crData || isSubmitting}
              isLoading={isSubmitting}
              data-testid="mcp-install-submit"
            >
              Install MCP server
            </Button>
          </>
        )}
        {step === 'installing' && (
          <>
            <Button variant="link" onClick={onClose}>
              Close
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate(mcpDeploymentsUrl(selectedNamespace))}
              isDisabled={!deploymentName}
              data-testid="mcp-install-view-status"
            >
              View installation status
            </Button>
          </>
        )}
      </ModalFooter>
    </Modal>
  );
};

export default McpServerInstallModal;
