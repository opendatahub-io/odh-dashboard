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
import { useNavigate, useParams } from 'react-router-dom';
import { ApplicationsPage } from '@odh-dashboard/ui-core';
import useWatchFeatureStoreDeployment, {
  DeploymentPhase,
} from '../../hooks/useWatchFeatureStoreDeployment';
import { FeatureStoreObject } from '../../const';
import { featureStoreRoute } from '../../routes';

const phaseConfig: Record<
  DeploymentPhase,
  {
    label: string;
    color: 'blue' | 'green' | 'red' | 'grey';
    icon: React.ReactNode;
    progress: number;
  }
> = {
  Pending: { label: 'Pending', color: 'grey', icon: <PendingIcon />, progress: 10 },
  Installing: { label: 'Installing', color: 'blue', icon: <InProgressIcon />, progress: 50 },
  Ready: { label: 'Ready', color: 'green', icon: <CheckCircleIcon />, progress: 100 },
  Failed: { label: 'Failed', color: 'red', icon: <ExclamationCircleIcon />, progress: 100 },
  Unknown: { label: 'Unknown', color: 'grey', icon: <PendingIcon />, progress: 0 },
};

const DeploymentProgressPage: React.FC = () => {
  const { namespace = '', name = '' } = useParams<{ namespace: string; name: string }>();
  const navigate = useNavigate();
  const deploymentStatus = useWatchFeatureStoreDeployment(namespace, name);
  const { featureStore, phase, podLogs, isComplete, isFailed, loaded, error, refresh } =
    deploymentStatus;
  const conditions = Array.isArray(deploymentStatus.conditions) ? deploymentStatus.conditions : [];
  const pods = Array.isArray(deploymentStatus.pods) ? deploymentStatus.pods : [];

  const config = phaseConfig[phase];

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
                <SplitItem>Deployment status</SplitItem>
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
                    value={config.progress}
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
                  {conditions.map((c) => (
                    <DescriptionListGroup key={c.type}>
                      <DescriptionListTerm>{c.type}</DescriptionListTerm>
                      <DescriptionListDescription>
                        <Split hasGutter>
                          <SplitItem>
                            <Label
                              color={c.status === 'True' ? 'green' : 'purple'}
                              icon={c.status === 'True' ? <CheckCircleIcon /> : <PendingIcon />}
                            >
                              {c.status === 'True' ? 'Complete' : 'Pending'}
                            </Label>
                          </SplitItem>
                          {(c.message || c.reason) && (
                            <SplitItem>{c.message || c.reason}</SplitItem>
                          )}
                        </Split>
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                  ))}
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
                    const podPhase = pod.status?.phase ?? 'Unknown';
                    return (
                      <StackItem key={pod.metadata.name}>
                        <Split>
                          <SplitItem isFilled>{pod.metadata.name}</SplitItem>
                          <SplitItem>
                            <Label
                              color={
                                podPhase === 'Running'
                                  ? 'green'
                                  : podPhase === 'Failed'
                                  ? 'red'
                                  : 'purple'
                              }
                              icon={
                                podPhase === 'Running' ? (
                                  <CheckCircleIcon />
                                ) : podPhase === 'Failed' ? (
                                  <ExclamationCircleIcon />
                                ) : (
                                  <PendingIcon />
                                )
                              }
                            >
                              {podPhase}
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
              The feature store deployment has failed. Review the conditions and pod logs for
              details.
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
              The feature store has been deployed successfully.
            </Alert>
          </StackItem>
        )}

        <StackItem>
          <Split hasGutter>
            <SplitItem>
              <Button
                variant="primary"
                onClick={() => navigate(featureStoreRoute(FeatureStoreObject.OVERVIEW))}
                data-testid="go-to-feature-store"
              >
                {isComplete ? 'Go to feature store' : 'Back to overview'}
              </Button>
            </SplitItem>
            {!isComplete && !isFailed && (
              <SplitItem>
                <Title headingLevel="h6" size="md">
                  Deployment in progress
                </Title>
              </SplitItem>
            )}
          </Split>
        </StackItem>
      </Stack>
    </ApplicationsPage>
  );
};

export default DeploymentProgressPage;
