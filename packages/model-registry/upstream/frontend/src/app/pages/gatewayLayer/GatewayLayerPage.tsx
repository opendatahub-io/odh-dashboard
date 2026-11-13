import * as React from 'react';
import { Link } from 'react-router-dom';
import { ApplicationsPage } from 'mod-arch-shared';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  Content,
  Flex,
  FlexItem,
  Label,
  List,
  ListItem,
  Spinner,
  Switch,
  Title,
} from '@patternfly/react-core';
import { ArrowLeftIcon, ArrowRightIcon } from '@patternfly/react-icons';
import { aiStackUrl } from '~/app/routes/aiStack/aiStack';
import { mcpServerDetailsUrl } from '~/app/routes/mcpCatalog/mcpCatalog';
import { useProjectsBridge } from '~/odh/context/ProjectsBridgeContext';
import NamespaceSelectorFieldWrapper from '~/odh/components/NamespaceSelectorFieldWrapper';
import useGatewayLayerStatus from '~/odh/hooks/useGatewayLayerStatus';
import useGatewayLayerUsability from '~/odh/hooks/useGatewayLayerUsability';
import { GatewayLayerComponentStatus } from '~/odh/types/gatewayLayerTypes';
import '~/app/pages/aiStack/aiStack.css';

type CapabilityState = 'executable' | 'validation' | 'planned';

type GatewayCapability = {
  name: string;
  description: string;
  state: CapabilityState;
  evidence: string;
};

const capabilities: GatewayCapability[] = [
  {
    name: 'MCP Gateway',
    description: 'Federate MCP servers with registration, exposure, and request validation.',
    state: 'executable',
    evidence: 'First executable capability; uses the AI Hub guided installer.',
  },
  {
    name: 'MaaS Gateway',
    description: 'Validate governed model access, routing, authentication, and quotas.',
    state: 'validation',
    evidence: 'Layer contract is defined; the MaaS adapter is the next implementation gate.',
  },
  {
    name: 'Inference Gateway',
    description: 'Validate the inference endpoint, routing policy, and model-serving boundary.',
    state: 'validation',
    evidence:
      'Layer contract is defined; endpoint-specific validation follows the platform baseline.',
  },
  {
    name: 'Identity and exposure',
    description: 'Validate identity policy, TLS, Gateway API exposure, and authenticated requests.',
    state: 'validation',
    evidence: 'Shared platform services are checked; Project Matrix owns only its layer resources.',
  },
  {
    name: 'Routing, quotas, and conformance',
    description: 'Prove the request path, limits, status reporting, and end-to-end behavior.',
    state: 'planned',
    evidence: 'Conformance probes complete the Gateway-layer definition of done.',
  },
];

const stateLabel: Record<CapabilityState, string> = {
  executable: 'Executable now',
  validation: 'Validation gate',
  planned: 'Next gate',
};

const statusLabel = (status: GatewayLayerComponentStatus): string => status.replaceAll('_', ' ');

const statusColor = (
  status: GatewayLayerComponentStatus,
): 'blue' | 'green' | 'orange' | 'red' | 'grey' => {
  switch (status) {
    case 'usable':
    case 'healthy':
      return 'green';
    case 'installed':
    case 'partial':
      return 'blue';
    case 'blocked':
      return 'red';
    case 'not_implemented':
      return 'orange';
    default:
      return 'grey';
  }
};

const GatewayLayerPage: React.FC = () => {
  const [innovationLane, setInnovationLane] = React.useState(false);
  const { preferredProject, projects, updatePreferredProject } = useProjectsBridge();
  const [selectedNamespace, setSelectedNamespace] = React.useState(preferredProject?.name ?? '');
  const [gatewayStatus, gatewayStatusLoaded, gatewayStatusError] =
    useGatewayLayerStatus(selectedNamespace);
  const mcpRegistrationHealthy = gatewayStatus?.components.some(
    (component) => component.id === 'mcp-registration' && component.status === 'healthy',
  );
  const usabilityChecked = gatewayStatus?.usabilityChecked ?? false;
  const [, usabilityProbeLoaded, usabilityProbeError] = useGatewayLayerUsability(
    selectedNamespace,
    Boolean(mcpRegistrationHealthy && !usabilityChecked),
  );

  React.useEffect(() => {
    if (!selectedNamespace && preferredProject?.name) {
      setSelectedNamespace(preferredProject.name);
    }
  }, [preferredProject?.name, selectedNamespace]);

  const handleProjectSelect = React.useCallback(
    (namespace: string) => {
      setSelectedNamespace(namespace);
      updatePreferredProject(projects.find((project) => project.name === namespace) ?? null);
    },
    [projects, updatePreferredProject],
  );

  return (
    <ApplicationsPage
      noTitle
      title="Gateway layer"
      description="Install and validate the complete Gateway horizontal layer. Production is the default lane; Innovation explicitly enables preview dependencies."
      empty={false}
      loaded
      provideChildrenPadding
    >
      <div className="ai-stack-page" data-testid="gateway-layer-page">
        <div className="ai-stack-intro">
          <Flex
            justifyContent={{ default: 'justifyContentSpaceBetween' }}
            alignItems={{ default: 'alignItemsFlexStart' }}
            gap={{ default: 'gapLg' }}
          >
            <FlexItem>
              <Button
                component={(props) => <Link {...props} to={aiStackUrl()} />}
                variant="link"
                icon={<ArrowLeftIcon />}
              >
                Red Hat AI Stack
              </Button>
              <Title headingLevel="h1" size="2xl">
                Gateway layer
              </Title>
              <Content component="p">
                One guided operation for the layer that connects agents, tools, models, identity,
                and policy. MCP is highlighted first because it is the first executable capability;
                the layer contract remains broader than MCP.
              </Content>
            </FlexItem>
            <FlexItem>
              <NamespaceSelectorFieldWrapper
                selectedNamespace={selectedNamespace}
                onSelect={handleProjectSelect}
                selectorOnly
              />
              <Switch
                id="gateway-layer-innovation-lane"
                label="Use Innovation lane"
                isChecked={innovationLane}
                onChange={(_event, checked) => setInnovationLane(checked)}
              />
              <Content component="small">
                Production is selected by default. Innovation permits Technology Preview
                dependencies for evaluation.
              </Content>
            </FlexItem>
          </Flex>
        </div>

        <Alert variant="info" title="Layer-wide installer contract" ouiaId="gateway-layer-contract">
          Shared operators and platform services are validated, never upgraded by this workflow.
          Project Matrix creates and removes only resources it owns.
        </Alert>

        <Card className="gateway-layer-status-card">
          <CardHeader>
            <Flex
              justifyContent={{ default: 'justifyContentSpaceBetween' }}
              alignItems={{ default: 'alignItemsCenter' }}
              gap={{ default: 'gapMd' }}
            >
              <FlexItem>
                <Title headingLevel="h2" size="lg">
                  Gateway layer status
                </Title>
              </FlexItem>
              {gatewayStatus ? (
                <FlexItem>
                  <Label color={statusColor(gatewayStatus.overallStatus)}>
                    {statusLabel(gatewayStatus.overallStatus)}
                  </Label>
                </FlexItem>
              ) : gatewayStatusLoaded ? null : (
                <FlexItem>
                  <Spinner size="sm" aria-label="Loading Gateway layer status" />
                </FlexItem>
              )}
            </Flex>
          </CardHeader>
          <CardBody>
            {!selectedNamespace && (
              <Alert variant="info" isInline title="Select a project to inspect the layer" />
            )}
            {gatewayStatusError && (
              <Alert variant="danger" isInline title="Gateway layer status could not be loaded">
                {gatewayStatusError.message}
              </Alert>
            )}
            {!usabilityChecked && mcpRegistrationHealthy && !usabilityProbeLoaded && (
              <Alert variant="info" isInline title="Checking authenticated MCP usability">
                <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
                  <Spinner size="sm" aria-label="Running authenticated MCP usability probes" />
                  <Content component="p">
                    Running initialize, tools/list, and tools/call through the Gateway.
                  </Content>
                </Flex>
              </Alert>
            )}
            {usabilityProbeError && (
              <Alert variant="warning" isInline title="Authenticated MCP usability check failed">
                {usabilityProbeError.message}
              </Alert>
            )}
            {gatewayStatus && (
              <>
                <Content component="p">{gatewayStatus.message}</Content>
                <List className="gateway-layer-status-list">
                  {gatewayStatus.components.map((component) => (
                    <ListItem key={component.id}>
                      <Flex
                        justifyContent={{ default: 'justifyContentSpaceBetween' }}
                        alignItems={{ default: 'alignItemsFlexStart' }}
                        gap={{ default: 'gapMd' }}
                      >
                        <FlexItem>
                          <Content component="p">
                            <b>{component.name}</b>
                          </Content>
                          <Content component="small">
                            {component.message || component.evidence}
                          </Content>
                        </FlexItem>
                        <FlexItem>
                          <Label color={statusColor(component.status)}>
                            {statusLabel(component.status)}
                          </Label>
                        </FlexItem>
                      </Flex>
                    </ListItem>
                  ))}
                </List>
              </>
            )}
          </CardBody>
        </Card>

        <div className="gateway-capability-grid" role="list" aria-label="Gateway capabilities">
          {capabilities.map((capability) => (
            <Card key={capability.name} role="listitem" className="gateway-capability-card">
              <CardHeader>
                <Flex
                  justifyContent={{ default: 'justifyContentSpaceBetween' }}
                  alignItems={{ default: 'alignItemsCenter' }}
                  gap={{ default: 'gapMd' }}
                >
                  <FlexItem>
                    <Title headingLevel="h2" size="lg">
                      {capability.name}
                    </Title>
                  </FlexItem>
                  <FlexItem>
                    <Label color={capability.state === 'executable' ? 'green' : 'orange'}>
                      {stateLabel[capability.state]}
                    </Label>
                  </FlexItem>
                </Flex>
              </CardHeader>
              <CardBody>
                <Content component="p">{capability.description}</Content>
                <Content component="small">{capability.evidence}</Content>
                {capability.state === 'executable' && (
                  <Button
                    variant="primary"
                    icon={<ArrowRightIcon />}
                    iconPosition="right"
                    component={(props) => (
                      <Link {...props} to={`${mcpServerDetailsUrl(1)}?source=Red+Hat`} />
                    )}
                  >
                    Install MCP capability
                  </Button>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      </div>
    </ApplicationsPage>
  );
};

export default GatewayLayerPage;
