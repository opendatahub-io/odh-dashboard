import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  PageSection,
  Title,
  Spinner,
  Bullseye,
  Alert,
  Button,
  ProgressStep,
  ProgressStepper,
  DescriptionList,
  DescriptionListGroup,
  DescriptionListTerm,
  DescriptionListDescription,
  ExpandableSection,
  CodeBlock,
  CodeBlockCode,
  Label,
  Flex,
  FlexItem,
  Stack,
  StackItem,
  Timestamp,
  TimestampFormat,
} from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InProgressIcon,
  PendingIcon,
} from '@patternfly/react-icons';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import ApplicationsPage from '@odh-dashboard/internal/pages/ApplicationsPage';
import { K8sCondition, PodKind } from '@odh-dashboard/internal/k8sTypes';
import useWatchFeatureStoreDeployment, {
  DeploymentPhase,
} from '../../hooks/useWatchFeatureStoreDeployment';

const phaseVariant = (phase: DeploymentPhase): 'success' | 'danger' | 'info' | 'pending' => {
  switch (phase) {
    case 'Ready':
      return 'success';
    case 'Failed':
      return 'danger';
    case 'Installing':
      return 'info';
    default:
      return 'pending';
  }
};

const PhaseIcon: React.FC<{ phase: DeploymentPhase }> = ({ phase }) => {
  switch (phase) {
    case 'Ready':
      return <CheckCircleIcon color="var(--pf-t--global--color--status--success--default)" />;
    case 'Failed':
      return <ExclamationCircleIcon color="var(--pf-t--global--color--status--danger--default)" />;
    case 'Installing':
      return <InProgressIcon color="var(--pf-t--global--color--status--info--default)" />;
    default:
      return <PendingIcon />;
  }
};

const ConditionRow: React.FC<{ condition: K8sCondition }> = ({ condition }) => (
  <DescriptionListGroup>
    <DescriptionListTerm>
      <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
        <FlexItem>{condition.type}</FlexItem>
        <FlexItem>
          <Label
            color={
              condition.status === 'True' ? 'green' : condition.status === 'False' ? 'red' : 'grey'
            }
          >
            {condition.status}
          </Label>
        </FlexItem>
      </Flex>
    </DescriptionListTerm>
    <DescriptionListDescription>
      {condition.message || condition.reason || '—'}
      {condition.lastTransitionTime && (
        <div style={{ marginTop: 4, fontSize: 'var(--pf-t--global--font--size--xs)' }}>
          <Timestamp
            date={new Date(condition.lastTransitionTime)}
            dateFormat={TimestampFormat.long}
          />
        </div>
      )}
    </DescriptionListDescription>
  </DescriptionListGroup>
);

const PodStatusSummary: React.FC<{ pods: PodKind[] }> = ({ pods }) => {
  if (pods.length === 0) {
    return <i>Waiting for pods to be created...</i>;
  }
  return (
    <DescriptionList isHorizontal>
      {pods.map((pod) => {
        const podPhase = pod.status?.phase ?? 'Pending';
        const ready = pod.status?.containerStatuses?.every((cs) => cs.ready) ?? false;
        return (
          <DescriptionListGroup key={pod.metadata.uid ?? pod.metadata.name}>
            <DescriptionListTerm>{pod.metadata.name}</DescriptionListTerm>
            <DescriptionListDescription>
              <Label
                color={
                  podPhase === 'Running' && ready ? 'green' : podPhase === 'Failed' ? 'red' : 'blue'
                }
              >
                {podPhase}
                {podPhase === 'Running' && !ready ? ' (not ready)' : ''}
              </Label>
            </DescriptionListDescription>
          </DescriptionListGroup>
        );
      })}
    </DescriptionList>
  );
};

const DeploymentProgressPage: React.FC = () => {
  const { namespace, name } = useParams<{ namespace: string; name: string }>();
  const navigate = useNavigate();

  const { featureStore, phase, conditions, pods, podLogs, isComplete, isFailed, error, loaded } =
    useWatchFeatureStoreDeployment(namespace ?? '', name ?? '');

  const [expandedLogs, setExpandedLogs] = React.useState<Record<string, boolean>>({});

  if (!namespace || !name) {
    return (
      <ApplicationsPage loaded empty={false}>
        <Alert variant="danger" isInline title="Missing parameters">
          Namespace and name are required.
        </Alert>
      </ApplicationsPage>
    );
  }

  if (!loaded) {
    return (
      <ApplicationsPage loaded={false} empty={false}>
        <Bullseye>
          <Spinner />
        </Bullseye>
      </ApplicationsPage>
    );
  }

  if (error && !featureStore) {
    return (
      <ApplicationsPage loaded empty={false}>
        <Alert variant="danger" isInline title="Error loading FeatureStore">
          {error.message}
        </Alert>
      </ApplicationsPage>
    );
  }

  const hostnames = featureStore?.status?.serviceHostnames;

  return (
    <ApplicationsPage
      loaded
      empty={false}
      title={`Deploying: ${name}`}
      breadcrumb={
        <Breadcrumb>
          <BreadcrumbItem
            render={() => <Link to="/develop-train/feature-store">Feature Store</Link>}
          />
          <BreadcrumbItem
            render={() => (
              <Link to="/develop-train/feature-store/create">Create feature store</Link>
            )}
          />
          <BreadcrumbItem isActive>{name}</BreadcrumbItem>
        </Breadcrumb>
      }
    >
      <PageSection hasBodyWrapper={false}>
        <Stack hasGutter>
          {/* Phase banner */}
          <StackItem>
            <Alert
              variant={phaseVariant(phase)}
              isInline
              title={
                <Flex
                  spaceItems={{ default: 'spaceItemsSm' }}
                  alignItems={{ default: 'alignItemsCenter' }}
                >
                  <FlexItem>
                    <PhaseIcon phase={phase} />
                  </FlexItem>
                  <FlexItem>
                    {phase === 'Ready'
                      ? 'Feature store deployed successfully'
                      : phase === 'Failed'
                      ? 'Feature store deployment failed'
                      : phase === 'Installing'
                      ? 'Feature store is being deployed...'
                      : 'Waiting for deployment to start...'}
                  </FlexItem>
                  {phase === 'Installing' && (
                    <FlexItem>
                      <Spinner size="md" />
                    </FlexItem>
                  )}
                </Flex>
              }
            >
              {featureStore?.status?.feastVersion && (
                <div>Feast version: {featureStore.status.feastVersion}</div>
              )}
            </Alert>
          </StackItem>

          {/* Progress stepper */}
          <StackItem>
            <ProgressStepper isVertical>
              <ProgressStep
                id="step-create"
                titleId="step-create-title"
                variant="success"
                description="FeatureStore CR submitted to the cluster"
              >
                Resource created
              </ProgressStep>
              <ProgressStep
                id="step-reconcile"
                titleId="step-reconcile-title"
                variant={
                  isComplete || isFailed
                    ? isFailed
                      ? 'danger'
                      : 'success'
                    : phase === 'Installing'
                    ? 'info'
                    : 'pending'
                }
                description={
                  phase === 'Installing'
                    ? 'Feast operator is reconciling the resource'
                    : phase === 'Ready'
                    ? 'Reconciliation complete'
                    : phase === 'Failed'
                    ? 'Reconciliation failed'
                    : 'Waiting for operator...'
                }
                icon={phase === 'Installing' ? <Spinner size="md" /> : undefined}
              >
                Operator reconciliation
              </ProgressStep>
              <ProgressStep
                id="step-pods"
                titleId="step-pods-title"
                variant={
                  isComplete
                    ? 'success'
                    : isFailed
                    ? 'danger'
                    : pods.length > 0
                    ? 'info'
                    : 'pending'
                }
                description={
                  pods.length > 0 ? `${pods.length} pod(s) detected` : 'Waiting for pods...'
                }
                icon={
                  !isComplete && !isFailed && pods.length > 0 ? <Spinner size="md" /> : undefined
                }
              >
                Pods running
              </ProgressStep>
              <ProgressStep
                id="step-ready"
                titleId="step-ready-title"
                variant={isComplete ? 'success' : isFailed ? 'danger' : 'pending'}
                description={
                  isComplete ? 'All services are available' : isFailed ? 'Deployment failed' : ''
                }
              >
                Ready
              </ProgressStep>
            </ProgressStepper>
          </StackItem>

          {/* Service hostnames */}
          {hostnames && Object.values(hostnames).some(Boolean) && (
            <StackItem>
              <Title headingLevel="h3">Service hostnames</Title>
              <DescriptionList isHorizontal className="pf-v6-u-mt-sm">
                {hostnames.registry && (
                  <DescriptionListGroup>
                    <DescriptionListTerm>Registry</DescriptionListTerm>
                    <DescriptionListDescription>{hostnames.registry}</DescriptionListDescription>
                  </DescriptionListGroup>
                )}
                {hostnames.registryRest && (
                  <DescriptionListGroup>
                    <DescriptionListTerm>Registry (REST)</DescriptionListTerm>
                    <DescriptionListDescription>
                      {hostnames.registryRest}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                )}
                {hostnames.onlineStore && (
                  <DescriptionListGroup>
                    <DescriptionListTerm>Online Store</DescriptionListTerm>
                    <DescriptionListDescription>{hostnames.onlineStore}</DescriptionListDescription>
                  </DescriptionListGroup>
                )}
                {hostnames.offlineStore && (
                  <DescriptionListGroup>
                    <DescriptionListTerm>Offline Store</DescriptionListTerm>
                    <DescriptionListDescription>
                      {hostnames.offlineStore}
                    </DescriptionListDescription>
                  </DescriptionListGroup>
                )}
                {hostnames.ui && (
                  <DescriptionListGroup>
                    <DescriptionListTerm>UI</DescriptionListTerm>
                    <DescriptionListDescription>{hostnames.ui}</DescriptionListDescription>
                  </DescriptionListGroup>
                )}
              </DescriptionList>
            </StackItem>
          )}

          {/* Conditions */}
          {conditions.length > 0 && (
            <StackItem>
              <ExpandableSection toggleText="Conditions" isIndented>
                <DescriptionList isHorizontal>
                  {conditions.map((c, i) => (
                    <ConditionRow key={c.type || i} condition={c} />
                  ))}
                </DescriptionList>
              </ExpandableSection>
            </StackItem>
          )}

          {/* Pod status */}
          <StackItem>
            <ExpandableSection toggleText={`Pods (${pods.length})`} isIndented isExpanded>
              <PodStatusSummary pods={pods} />
            </ExpandableSection>
          </StackItem>

          {/* Pod logs */}
          {Object.keys(podLogs.data).length > 0 && (
            <StackItem>
              <Title headingLevel="h3">Pod logs</Title>
              <Stack hasGutter className="pf-v6-u-mt-sm">
                {Object.entries(podLogs.data).map(([key, logs]) => {
                  const isInit = key.includes('/init:');
                  return (
                    <StackItem key={key}>
                      <ExpandableSection
                        toggleText={
                          isInit ? `${key.replace('/init:', ' / init: ')} (init container)` : key
                        }
                        isExpanded={expandedLogs[key] ?? isInit}
                        onToggle={(_e, expanded) =>
                          setExpandedLogs((prev) => ({ ...prev, [key]: expanded }))
                        }
                        isIndented
                      >
                        <CodeBlock>
                          <CodeBlockCode>{logs || '(no logs yet)'}</CodeBlockCode>
                        </CodeBlock>
                      </ExpandableSection>
                    </StackItem>
                  );
                })}
              </Stack>
            </StackItem>
          )}

          {/* Navigation buttons */}
          <StackItem>
            <Flex>
              {isComplete && featureStore && (
                <FlexItem>
                  <Button
                    variant="primary"
                    onClick={() =>
                      navigate(
                        `/develop-train/feature-store/overview/${featureStore.spec.feastProject}`,
                      )
                    }
                  >
                    Go to Feature Store overview
                  </Button>
                </FlexItem>
              )}
              {isFailed && (
                <FlexItem>
                  <Button
                    variant="secondary"
                    onClick={() => navigate('/develop-train/feature-store/create')}
                  >
                    Try again
                  </Button>
                </FlexItem>
              )}
              <FlexItem>
                <Button
                  variant="link"
                  onClick={() => navigate('/develop-train/feature-store/manage')}
                >
                  Manage feature stores
                </Button>
              </FlexItem>
            </Flex>
          </StackItem>
        </Stack>
      </PageSection>
    </ApplicationsPage>
  );
};

export default DeploymentProgressPage;
