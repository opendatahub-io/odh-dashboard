import React from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Title,
  Card,
  CardBody,
  Grid,
  GridItem,
  DescriptionList,
  DescriptionListTerm,
  DescriptionListGroup,
  DescriptionListDescription,
  Breadcrumb,
  BreadcrumbItem,
  Label,
  Timestamp,
  Spinner,
  Bullseye,
  Alert,
  Tabs,
  Tab,
  TabTitleText,
} from '@patternfly/react-core';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import {
  ExperimentRunStatus,
  ExperimentRunState,
  RegistryMetricArtifact,
  RegistryParameterArtifact,
} from '#~/concepts/modelRegistry/types';
import useExperimentRunById from '#~/concepts/modelRegistry/apiHooks/useExperimentRunById';
import useExperimentById from '#~/concepts/modelRegistry/apiHooks/useExperimentById';
import useExperimentRunArtifacts from '#~/concepts/modelRegistry/apiHooks/useExperimentRunArtifacts';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import { experimentsRunsRoute, experimentsBaseRoute } from '#~/routes/experiments/registryBase';
import { ModelRegistriesContext } from '#~/concepts/modelRegistry/context/ModelRegistriesContext';
import MetricHistoryChart from './MetricHistoryChart';

const getStatusColor = (
  status?: ExperimentRunStatus,
): 'grey' | 'green' | 'blue' | 'red' | 'orange' => {
  switch (status) {
    case ExperimentRunStatus.FINISHED:
      return 'green';
    case ExperimentRunStatus.RUNNING:
      return 'blue';
    case ExperimentRunStatus.FAILED:
      return 'red';
    case ExperimentRunStatus.KILLED:
      return 'red';
    case ExperimentRunStatus.SCHEDULED:
      return 'orange';
    default:
      return 'grey';
  }
};

const getStateColor = (state?: ExperimentRunState): 'grey' | 'green' | 'red' => {
  switch (state) {
    case ExperimentRunState.LIVE:
      return 'green';
    case ExperimentRunState.ARCHIVED:
      return 'red';
    default:
      return 'grey';
  }
};

const ExperimentRunDetails: React.FC = () => {
  const { runId, experimentId, modelRegistry } = useParams<{
    runId: string;
    experimentId: string;
    modelRegistry: string;
  }>();

  const [experimentRun, runLoaded, runError] = useExperimentRunById(runId);
  const [experiment, experimentLoaded, experimentError] = useExperimentById(experimentId);
  const [artifactsData, artifactsLoaded, artifactsError] = useExperimentRunArtifacts(runId);
  const { preferredModelRegistry } = React.useContext(ModelRegistriesContext);
  const [activeTabKey, setActiveTabKey] = React.useState<string | number>(0);

  // Filter artifacts by type
  const metrics: RegistryMetricArtifact[] = React.useMemo(
    () =>
      artifactsData.items.filter(
        (artifact): artifact is RegistryMetricArtifact => artifact.artifactType === 'metric',
      ),
    [artifactsData.items],
  );

  const parameters: RegistryParameterArtifact[] = React.useMemo(
    () =>
      artifactsData.items.filter(
        (artifact): artifact is RegistryParameterArtifact => artifact.artifactType === 'parameter',
      ),
    [artifactsData.items],
  );

  // Extract tags from custom properties
  const tags = React.useMemo(() => {
    if (!experimentRun?.customProperties) {
      return [];
    }
    return Object.entries(experimentRun.customProperties)
      .filter(([key]) => !key.startsWith('mlflow.')) // Filter out MLflow internal properties
      .map(([key, value]) => {
        let displayValue = '-';
        if ('string_value' in value) {
          displayValue = value.string_value;
        } else if ('double_value' in value) {
          displayValue = value.double_value.toString();
        } else if ('int_value' in value) {
          displayValue = value.int_value;
        } else if ('bool_value' in value) {
          displayValue = value.bool_value.toString();
        }
        return { key, value: displayValue };
      });
  }, [experimentRun?.customProperties]);

  // Calculate duration
  const duration = React.useMemo(() => {
    if (!experimentRun?.startTimeSinceEpoch || !experimentRun.endTimeSinceEpoch) {
      return null;
    }
    const start = parseInt(experimentRun.startTimeSinceEpoch, 10);
    const end = parseInt(experimentRun.endTimeSinceEpoch, 10);
    const durationMs = end - start;
    const durationMinutes = Math.round(durationMs / 60000);
    return `${durationMinutes}ms`;
  }, [experimentRun?.startTimeSinceEpoch, experimentRun?.endTimeSinceEpoch]);

  if (runError || experimentError || artifactsError) {
    return (
      <Alert variant="danger" title="Error loading run details">
        {runError?.message || experimentError?.message || artifactsError?.message}
      </Alert>
    );
  }

  if (!runLoaded || !experimentLoaded || !artifactsLoaded) {
    return (
      <Bullseye>
        <Spinner size="xl" />
      </Bullseye>
    );
  }

  const breadcrumb = (
    <Breadcrumb>
      <BreadcrumbItem>
        <Link to={experimentsBaseRoute(modelRegistry || preferredModelRegistry?.metadata.name)}>
          Experiments
        </Link>
      </BreadcrumbItem>
      <BreadcrumbItem>
        <Link
          to={experimentsRunsRoute(
            modelRegistry || preferredModelRegistry?.metadata.name,
            experimentId,
          )}
        >
          {experiment?.name || 'Experiment'}
        </Link>
      </BreadcrumbItem>
      <BreadcrumbItem isActive>Run: {experimentRun?.name || runId}</BreadcrumbItem>
    </Breadcrumb>
  );

  return (
    <ApplicationsPage
      breadcrumb={breadcrumb}
      title={`Run: ${experimentRun?.name || runId || ''}`}
      description={experimentRun?.description || ''}
      loaded={runLoaded}
      provideChildrenPadding
      empty={false}
    >
      <Tabs
        activeKey={activeTabKey}
        onSelect={(_, tabIndex) => setActiveTabKey(tabIndex)}
        aria-label="Run details tabs"
        role="region"
      >
        <Tab eventKey={0} title={<TabTitleText>Overview</TabTitleText>} aria-label="Overview tab">
          <Grid hasGutter>
            <GridItem span={8}>
              {/* Run Parameters Section */}
              <Card style={{ marginBottom: '24px' }}>
                <CardBody>
                  <Title headingLevel="h2" size="lg" style={{ marginBottom: '16px' }}>
                    Run Params
                  </Title>
                  {parameters.length > 0 ? (
                    <Table variant="compact">
                      <Thead>
                        <Tr>
                          <Th>Name ({parameters.length})</Th>
                          <Th>Value</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {parameters.map((param) => (
                          <Tr key={param.id}>
                            <Td>{param.name}</Td>
                            <Td>
                              {'value' in param && param.value != null ? String(param.value) : '-'}
                            </Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  ) : (
                    <div>No parameters found</div>
                  )}
                </CardBody>
              </Card>

              {/* Metrics Section */}
              <Card>
                <CardBody>
                  <Title headingLevel="h2" size="lg" style={{ marginBottom: '16px' }}>
                    Metrics
                  </Title>
                  {metrics.length > 0 ? (
                    <Table variant="compact">
                      <Thead>
                        <Tr>
                          <Th>Name ({metrics.length})</Th>
                          <Th>Context</Th>
                          <Th>Last Value</Th>
                        </Tr>
                      </Thead>
                      <Tbody>
                        {metrics.map((metric) => (
                          <Tr key={metric.id}>
                            <Td>{metric.name}</Td>
                            <Td>
                              <Label color="blue">subset=&quot;test&quot;</Label>
                            </Td>
                            <Td>{metric.value}</Td>
                          </Tr>
                        ))}
                      </Tbody>
                    </Table>
                  ) : (
                    <div>No metrics found</div>
                  )}
                </CardBody>
              </Card>
            </GridItem>

            <GridItem span={4}>
              {/* Information Section */}
              <Card>
                <CardBody>
                  <Title headingLevel="h2" size="lg" style={{ marginBottom: '16px' }}>
                    Information
                  </Title>
                  <DescriptionList>
                    {experimentRun?.createTimeSinceEpoch && (
                      <DescriptionListGroup>
                        <DescriptionListTerm>Created</DescriptionListTerm>
                        <DescriptionListDescription>
                          <Timestamp
                            date={new Date(parseInt(experimentRun.createTimeSinceEpoch, 10))}
                          />
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                    )}
                    {experimentRun?.startTimeSinceEpoch && (
                      <DescriptionListGroup>
                        <DescriptionListTerm>Started</DescriptionListTerm>
                        <DescriptionListDescription>
                          <Timestamp
                            date={new Date(parseInt(experimentRun.startTimeSinceEpoch, 10))}
                          />
                        </DescriptionListDescription>
                      </DescriptionListGroup>
                    )}
                    {duration && (
                      <DescriptionListGroup>
                        <DescriptionListTerm>Duration</DescriptionListTerm>
                        <DescriptionListDescription>{duration}</DescriptionListDescription>
                      </DescriptionListGroup>
                    )}
                    <DescriptionListGroup>
                      <DescriptionListTerm>Owner</DescriptionListTerm>
                      <DescriptionListDescription>
                        {experimentRun?.owner || '-'}
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                    <DescriptionListGroup>
                      <DescriptionListTerm>State</DescriptionListTerm>
                      <DescriptionListDescription>
                        <Label color={getStateColor(experimentRun?.state)}>
                          {experimentRun?.state || 'LIVE'}
                        </Label>
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                    <DescriptionListGroup>
                      <DescriptionListTerm>Status</DescriptionListTerm>
                      <DescriptionListDescription>
                        <Label color={getStatusColor(experimentRun?.status)}>
                          {experimentRun?.status || 'UNKNOWN'}
                        </Label>
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                    <DescriptionListGroup>
                      <DescriptionListTerm>Experiment</DescriptionListTerm>
                      <DescriptionListDescription>
                        <Link
                          to={experimentsRunsRoute(
                            modelRegistry || preferredModelRegistry?.metadata.name,
                            experimentId,
                          )}
                        >
                          {experiment?.name || 'Unnamed Experiment'}
                        </Link>
                      </DescriptionListDescription>
                    </DescriptionListGroup>
                  </DescriptionList>

                  {/* Tags Section */}
                  {tags.length > 0 && (
                    <>
                      <Title
                        headingLevel="h3"
                        size="md"
                        style={{ marginTop: '24px', marginBottom: '16px' }}
                      >
                        TAGS ({tags.length})
                      </Title>
                      <div>
                        {tags.map(({ key, value }) => (
                          <div key={key} style={{ marginBottom: '8px' }}>
                            <Label color="blue">{key}</Label>
                            <span style={{ marginLeft: '8px' }}>{value}</span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </CardBody>
              </Card>
            </GridItem>
          </Grid>
        </Tab>
        <Tab eventKey={1} title={<TabTitleText>Metrics</TabTitleText>} aria-label="Metrics tab">
          <Grid hasGutter style={{ marginTop: '24px' }}>
            {metrics.map((metric) => (
              <GridItem key={metric.id} xl={6} lg={12}>
                <MetricHistoryChart
                  experimentRunId={runId || ''}
                  metricName={metric.name}
                  context='subset="test"'
                  width={500}
                  height={300}
                />
              </GridItem>
            ))}
            {metrics.length === 0 && (
              <GridItem span={12}>
                <Card>
                  <CardBody>
                    <Title headingLevel="h3" size="lg">
                      No metrics available
                    </Title>
                    <div style={{ marginTop: '16px' }}>
                      No metrics found for this experiment run.
                    </div>
                  </CardBody>
                </Card>
              </GridItem>
            )}
          </Grid>
        </Tab>
      </Tabs>
    </ApplicationsPage>
  );
};

export default ExperimentRunDetails;
