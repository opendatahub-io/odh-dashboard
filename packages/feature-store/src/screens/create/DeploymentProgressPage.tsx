import React from 'react';
import {
  Alert,
  Bullseye,
  Button,
  Card,
  CardBody,
  CardTitle,
  CodeBlock,
  CodeBlockCode,
  DescriptionList,
  DescriptionListDescription,
  DescriptionListGroup,
  DescriptionListTerm,
  ExpandableSection,
  Label,
  Progress,
  ProgressMeasureLocation,
  ProgressVariant,
  Spinner,
  Split,
  SplitItem,
  Stack,
  StackItem,
  Title,
} from '@patternfly/react-core';
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  InProgressIcon,
  PendingIcon,
} from '@patternfly/react-icons';
import { Link, useParams } from 'react-router-dom';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import useWatchFeatureStoreDeployment, {
  DeploymentPhase,
} from '../../hooks/useWatchFeatureStoreDeployment';
import { featureStoreManageRoute } from '../../routes';
import {
  hasConditionFailure,
  humanizeConditionType,
  resolveConditionDisplay,
} from '../../statusUtils';

const FeatureStoresLink = (props: React.ComponentProps<'a'>) => (
  <Link {...props} to={featureStoreManageRoute()} />
);

const phaseConfig: Record<
  DeploymentPhase,
  {
    label: string;
    color: 'blue' | 'green' | 'red' | 'grey' | 'purple';
    icon: React.ReactNode;
  }
> = {
  Pending: { label: 'Pending', color: 'purple', icon: <PendingIcon /> },
  Installing: { label: 'Installing', color: 'blue', icon: <InProgressIcon /> },
  Ready: { label: 'Ready', color: 'green', icon: <CheckCircleIcon /> },
  Failed: { label: 'Failed', color: 'red', icon: <ExclamationCircleIcon /> },
  Unknown: { label: 'Pending', color: 'purple', icon: <PendingIcon /> },
};

const computeProgress = (phase: DeploymentPhase, conditions: { status?: string }[]): number => {
  if (phase === 'Ready' || phase === 'Failed') {
    return 100;
  }
  const len = Array.isArray(conditions) ? conditions.length : 0;
  if (len === 0) {
    return phase === 'Installing' ? 20 : 10;
  }
  const completed = conditions.filter((c) => c.status === 'True').length;
  return Math.round(10 + (completed / len) * 85);
};

const DeploymentProgressPage: React.FC = () => {
  const { namespace = '', name = '' } = useParams<{ namespace: string; name: string }>();
  const deploymentStatus = useWatchFeatureStoreDeployment(namespace, name);
  const {
    featureStore,
    phase: operatorPhase,
    conditions,
    pods,
    podLogs,
    isComplete: operatorComplete,
    isFailed: operatorFailed,
    loaded,
    error,
    refresh,
  } = deploymentStatus;

  const conditionsFailed = hasConditionFailure(conditions);
  const effectivePhase: DeploymentPhase =
    operatorPhase === 'Pending' && conditionsFailed ? 'Failed' : operatorPhase;
  const isComplete = operatorComplete;
  const isFailed = operatorFailed || conditionsFailed;
  const config = phaseConfig[effectivePhase];

  if (error && !loaded) {
    return (
      <ApplicationsPage title="Deployment progress" loaded loadError={error} empty={false}>
        {null}
      </ApplicationsPage>
    );
  }

  if (!loaded) {
    return (
      <Bullseye>
        <Spinner size="xl" aria-label="Loading deployment status" />
      </Bullseye>
    );
  }

  return (
    <ApplicationsPage
      title={`Deploying ${name}`}
      description={`Deployment in project ${namespace}`}
      loaded
      empty={false}
      provideChildrenPadding
      headerContent={null}
    >
      <Stack hasGutter>
        {error && (
          <StackItem>
            <Alert
              variant="warning"
              isInline
              title="Deployment status may be out of date"
              data-testid="deployment-stale-alert"
              actionLinks={
                <Button variant="link" isInline onClick={refresh}>
                  Retry
                </Button>
              }
            >
              {error.message}
            </Alert>
          </StackItem>
        )}
        <StackItem>
          <Card data-testid="deployment-status-card">
            <CardTitle>
              <Split hasGutter>
                <SplitItem isFilled>Deployment status</SplitItem>
                <SplitItem>
                  <Label color={config.color} icon={config.icon}>
                    {config.label}
                  </Label>
                </SplitItem>
              </Split>
            </CardTitle>
            <CardBody>
              <Stack hasGutter>
                <StackItem>
                  <Progress
                    value={computeProgress(effectivePhase, conditions)}
                    title={config.label}
                    variant={
                      isFailed
                        ? ProgressVariant.danger
                        : isComplete
                        ? ProgressVariant.success
                        : undefined
                    }
                    measureLocation={ProgressMeasureLocation.outside}
                    data-testid="deployment-progress-bar"
                  />
                </StackItem>
                {featureStore?.status?.feastVersion && (
                  <StackItem>
                    <DescriptionList isHorizontal isCompact>
                      <DescriptionListGroup>
                        <DescriptionListTerm>Feast version</DescriptionListTerm>
                        <DescriptionListDescription>
                          {featureStore.status.feastVersion}
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                    </DescriptionList>
                  </StackItem>
                )}
              </Stack>
            </CardBody>
          </Card>
        </StackItem>

        {conditions.length > 0 && (
          <StackItem>
            <Card data-testid="deployment-conditions-card">
              <CardTitle>Conditions</CardTitle>
              <CardBody>
                <DescriptionList isHorizontal isCompact>
                  {conditions.map((c) => {
                    const { label: condLabel, color: condColor } = resolveConditionDisplay(c);
                    const condIcon =
                      condLabel === 'Complete' ? (
                        <CheckCircleIcon />
                      ) : condLabel === 'Failed' ? (
                        <ExclamationCircleIcon />
                      ) : (
                        <PendingIcon />
                      );
                    return (
                      <DescriptionListGroup key={c.type}>
                        <DescriptionListTerm>{humanizeConditionType(c.type)}</DescriptionListTerm>
                        <DescriptionListDescription>
                          <Split hasGutter>
                            <SplitItem>
                              <Label color={condColor} icon={condIcon}>
                                {condLabel}
                              </Label>
                            </SplitItem>
                            {(c.message || c.reason) && (
                              <SplitItem>{c.message || c.reason}</SplitItem>
                            )}
                          </Split>
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                    );
                  })}
                </DescriptionList>
              </CardBody>
            </Card>
          </StackItem>
        )}

        {pods.length > 0 && (
          <StackItem>
            <Card data-testid="deployment-pods-card">
              <CardTitle>Pods ({pods.length})</CardTitle>
              <CardBody>
                <Stack hasGutter>
                  {pods.map((pod) => {
                    const rawPhase = pod.status?.phase;
                    const podLabel =
                      rawPhase === 'Running'
                        ? 'Running'
                        : rawPhase === 'Failed' || rawPhase === 'Error'
                        ? 'Failed'
                        : 'Pending';
                    return (
                      <StackItem key={pod.metadata.name}>
                        <Split>
                          <SplitItem isFilled>{pod.metadata.name}</SplitItem>
                          <SplitItem>
                            <Label
                              color={
                                podLabel === 'Running'
                                  ? 'green'
                                  : podLabel === 'Failed'
                                  ? 'red'
                                  : 'purple'
                              }
                              icon={
                                podLabel === 'Running' ? (
                                  <CheckCircleIcon />
                                ) : podLabel === 'Failed' ? (
                                  <ExclamationCircleIcon />
                                ) : (
                                  <PendingIcon />
                                )
                              }
                            >
                              {podLabel}
                            </Label>
                          </SplitItem>
                        </Split>
                      </StackItem>
                    );
                  })}
                </Stack>
              </CardBody>
            </Card>
          </StackItem>
        )}

        {pods.length > 0 && podLogs.error && (
          <StackItem>
            <Alert
              variant="warning"
              isInline
              title="Pod logs are unavailable"
              data-testid="deployment-pod-logs-error"
              actionLinks={
                <Button variant="link" isInline onClick={podLogs.refresh}>
                  Retry
                </Button>
              }
            >
              {podLogs.error.message}
            </Alert>
          </StackItem>
        )}

        {Object.keys(podLogs.data).length > 0 && (
          <StackItem>
            <Card data-testid="deployment-logs-card">
              <CardTitle>Pod logs</CardTitle>
              <CardBody>
                <Stack hasGutter>
                  {Object.entries(podLogs.data).map(([key, logText]) => (
                    <StackItem key={key}>
                      <ExpandableSection toggleText={key} isIndented>
                        <CodeBlock>
                          <CodeBlockCode>{logText}</CodeBlockCode>
                        </CodeBlock>
                      </ExpandableSection>
                    </StackItem>
                  ))}
                </Stack>
              </CardBody>
            </Card>
          </StackItem>
        )}

        {isFailed && (
          <StackItem>
            <Alert
              variant="danger"
              isInline
              title="Deployment failed"
              data-testid="deployment-failed-alert"
            >
              Review the conditions and pod logs. Delete this feature store, then create it again.
            </Alert>
          </StackItem>
        )}

        {isComplete && (
          <StackItem>
            <Alert
              variant="success"
              isInline
              title="Deployment complete"
              data-testid="deployment-success-alert"
            >
              This feature store is ready. Open it from Feature stores.
            </Alert>
          </StackItem>
        )}

        {!error && !isComplete && !isFailed && (
          <StackItem>
            <Title headingLevel="h6" size="md">
              Deployment in progress
            </Title>
          </StackItem>
        )}

        <StackItem>
          <Button
            variant="primary"
            component={FeatureStoresLink}
            data-testid="go-to-feature-stores-btn"
          >
            Go to Feature stores
          </Button>
        </StackItem>
      </Stack>
    </ApplicationsPage>
  );
};

export default DeploymentProgressPage;
