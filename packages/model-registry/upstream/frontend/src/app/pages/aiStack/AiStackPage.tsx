import * as React from 'react';
import { Link } from 'react-router-dom';
import { ApplicationsPage } from 'mod-arch-shared';
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Content,
  Flex,
  FlexItem,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Stack,
  StackItem,
  Switch,
  Title,
} from '@patternfly/react-core';
import { ArrowRightIcon } from '@patternfly/react-icons';
import { aiStackUrl, gatewayLayerUrl } from '~/app/routes/aiStack/aiStack';
import './aiStack.css';

type LayerState = 'available' | 'preview' | 'planned';

type LayerDefinition = {
  id: string;
  name: string;
  description: string;
  components: string[];
  dependencies: string;
  state: LayerState;
  color: string;
};

const layers: LayerDefinition[] = [
  {
    id: 'frameworks',
    name: 'Customer chooses any framework',
    description: 'Bring Your Own Agent framework into the Red Hat AI Stack.',
    components: ['LangGraph', 'CrewAI', 'ADK', 'Strands', 'Custom'],
    dependencies: 'No Red Hat framework dependency',
    state: 'planned',
    color: 'blue',
  },
  {
    id: 'onboarding',
    name: 'Secure Agent Onboarding',
    description: 'Provide a trusted identity and execution boundary for agents.',
    components: ['Sandbox', 'SPIFFE/SPIRE', 'Identity'],
    dependencies: 'Sandbox and identity services',
    state: 'preview',
    color: 'yellow',
  },
  {
    id: 'gateway',
    name: 'Gateway',
    description: 'Install and validate MCP, MaaS, and inference gateway capabilities.',
    components: ['MaaS Gateway', 'MCP Gateway', 'Inference Gateway', 'Auth, routing, quotas'],
    dependencies: 'MCP Lifecycle, RHCL, Gateway API',
    state: 'available',
    color: 'green',
  },
  {
    id: 'ogx',
    name: 'OGX',
    description: 'Expose Responses API, connectors, retrieval, and provider integrations.',
    components: ['Responses API', 'Messages API', 'Connectors', 'RAG', 'Multi-provider backend'],
    dependencies: 'Gateway and model-serving layer',
    state: 'preview',
    color: 'green',
  },
  {
    id: 'llm-d',
    name: 'llm-d',
    description: 'Add disaggregated routing on top of the model-serving layer.',
    components: ['Disaggregated routing', 'Prefill/decode separation'],
    dependencies: 'vLLM and supported accelerator topology',
    state: 'planned',
    color: 'light-blue',
  },
  {
    id: 'vllm',
    name: 'vLLM (core)',
    description: 'Provide self-hosted chat completions and tool calling.',
    components: ['Chat completions', 'Tool calling'],
    dependencies: 'Model, accelerator, and serving runtime',
    state: 'preview',
    color: 'red',
  },
  {
    id: 'agentops',
    name: 'AgentOps',
    description: 'Operate agents with tracing, evaluation, cost controls, and guardrails.',
    components: ['Deep tracing', 'EvalHub', 'Cost tracking', 'Guardrails'],
    dependencies: 'Gateway, serving, and observability services',
    state: 'planned',
    color: 'orange',
  },
  {
    id: 'infrastructure',
    name: 'Infrastructure',
    description: 'Use OpenShift and Red Hat AI infrastructure as the platform foundation.',
    components: ['OpenShift', 'GPUs', 'TPUs', 'RHEL AI'],
    dependencies: 'Cluster administrator and infrastructure capacity',
    state: 'planned',
    color: 'salmon',
  },
];

const stateLabel: Record<LayerState, string> = {
  available: 'Available now',
  preview: 'Design preview',
  planned: 'Planned',
};

const AiStackPage: React.FC = () => {
  const [selectedLayer, setSelectedLayer] = React.useState<LayerDefinition>();
  const [innovationLane, setInnovationLane] = React.useState(false);

  return (
    <ApplicationsPage
      noTitle
      title="Red Hat AI Stack"
      description="Install and validate the platform one horizontal layer at a time. Production is the default lane; Innovation explicitly enables preview capabilities."
      empty={false}
      loaded
      provideChildrenPadding
    >
      <div className="ai-stack-page" data-testid="ai-stack-page">
        <div className="ai-stack-intro">
          <Flex
            justifyContent={{ default: 'justifyContentSpaceBetween' }}
            alignItems={{ default: 'alignItemsFlexStart' }}
            gap={{ default: 'gapLg' }}
          >
            <FlexItem>
              <Title headingLevel="h1" size="2xl">
                The Red Hat AI Stack
              </Title>
              <Content component="p">
                Select a layer to open its one-click installer or preview the next installer in the
                sequence. Each layer reports against the capabilities it actually uses.
              </Content>
            </FlexItem>
            <FlexItem>
              <Switch
                id="ai-stack-innovation-lane"
                label="Use Innovation lane"
                isChecked={innovationLane}
                onChange={(_event, checked) => setInnovationLane(checked)}
              />
              <Content component="small">
                Production is selected by default. This selection is carried into the layer
                installer.
              </Content>
            </FlexItem>
          </Flex>
        </div>

        <div className="ai-stack-visual" role="list" aria-label="Red Hat AI Stack layers">
          {layers.map((layer, index) => (
            <React.Fragment key={layer.id}>
              <Card
                isSelectable
                isSelected={selectedLayer?.id === layer.id}
                className={`ai-stack-layer ai-stack-layer--${layer.color}`}
                role="listitem"
                data-testid={`ai-stack-layer-${layer.id}`}
                onClick={() => setSelectedLayer(layer)}
              >
                <CardHeader>
                  <Flex
                    justifyContent={{ default: 'justifyContentSpaceBetween' }}
                    alignItems={{ default: 'alignItemsCenter' }}
                    gap={{ default: 'gapMd' }}
                  >
                    <FlexItem>
                      <Title headingLevel="h2" size="xl">
                        {layer.name}
                      </Title>
                    </FlexItem>
                    <FlexItem>
                      <Label color={layer.state === 'available' ? 'green' : 'grey'}>
                        {stateLabel[layer.state]}
                      </Label>
                    </FlexItem>
                  </Flex>
                </CardHeader>
                <CardBody>
                  <Content component="p">{layer.description}</Content>
                  <div className="ai-stack-components">
                    {layer.components.map((component) => (
                      <span key={component} className="ai-stack-component">
                        {component}
                      </span>
                    ))}
                  </div>
                </CardBody>
                <CardFooter>
                  {layer.state === 'available' ? (
                    <Button
                      variant="primary"
                      icon={<ArrowRightIcon />}
                      iconPosition="right"
                      component={(props) => (
                        <Link {...props} to={gatewayLayerUrl()} />
                      )}
                      onClick={(event) => event.stopPropagation()}
                    >
                      Open Gateway layer
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      icon={<ArrowRightIcon />}
                      iconPosition="right"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedLayer(layer);
                      }}
                    >
                      View installer preview
                    </Button>
                  )}
                </CardFooter>
              </Card>
              {index < layers.length - 1 && <div className="ai-stack-connector" aria-hidden="true" />}
            </React.Fragment>
          ))}
        </div>

        <div className="ai-stack-note">
          <Content component="p">
            The Gateway layer is the first executable delivery. The other cards establish the
            same installer contract now so each future layer can be added without changing the
            user journey.
          </Content>
          <Button variant="link" component={(props) => <Link {...props} to={aiStackUrl()} />}>
            Return to stack overview
          </Button>
        </div>
      </div>

      <Modal
        isOpen={!!selectedLayer && selectedLayer.state !== 'available'}
        onClose={() => setSelectedLayer(undefined)}
        variant="medium"
      >
        {selectedLayer && (
          <>
            <ModalHeader title={`Install ${selectedLayer.name}`} />
            <ModalBody>
              <Stack hasGutter>
                <StackItem>
                  <Content component="p">{selectedLayer.description}</Content>
                  <Content component="p">
                    This layer is rendered in the AI Hub installer flow while its deployment logic
                    is developed upstream.
                  </Content>
                </StackItem>
                <StackItem>
                  <Title headingLevel="h3" size="lg">
                    Installation contract
                  </Title>
                  <ul>
                    <li>Select a project.</li>
                    <li>Check platform dependencies.</li>
                    <li>Create the layer resources.</li>
                    <li>Follow live status through validation.</li>
                  </ul>
                </StackItem>
                <StackItem>
                  <Label color="orange">{stateLabel[selectedLayer.state]}</Label>{' '}
                  {selectedLayer.dependencies}
                </StackItem>
              </Stack>
            </ModalBody>
            <ModalFooter>
              <Button isDisabled>Installer logic not yet available</Button>
              <Button variant="link" onClick={() => setSelectedLayer(undefined)}>
                Close
              </Button>
            </ModalFooter>
          </>
        )}
      </Modal>
    </ApplicationsPage>
  );
};

export default AiStackPage;
